// Live-vs-clone per-section screenshot capture, the input of extraction/pixel_parity.py.
//
//   PLAYWRIGHT_MODULE=<playwright module or package name> TARGET_URL=<url> OUT_DIR=<dir> \
//   PREFIX=o|c [VIEWPORT=1440x900] node extraction/pixel_capture.mjs
//
// Run once on the original (PREFIX=o) and once on the clone (PREFIX=c) with the same script.
// No machine paths live in this file. For every viewport (1440x900, 1280x800, 390x844; 390 is
// emulated as a touch phone) and every section of dump_geometry.mjs, the section is reached by
// SCROLLING (wheel on the desktop loop scroller, scrollTo steps on mobile) so the same
// scroll-triggered typewriters run on both sites; it is screenshotted in viewport-height tiles
// (section top at viewport y 0, then +vh ...). Fixed layers (sidebar, hero ticket, cookie,
// mobile menu) are captured at scroll 0.
// Determinism: fresh context, device scale factor 1, prefers-reduced-motion: reduce (stops the
// randomised demo bot cursors on both sites), document.fonts.ready, text stable 2.5 s, pointer
// parked at (3,3), CSS transitions off, Web Animations paused at FREEZE_MS (default 3000).
// Writes <OUT_DIR>/<PREFIX><vp>_<section>_<tile>.png plus <PREFIX><vp>.json with each tile's
// crop box and mask boxes (viewport coordinates). Masked on purpose (same rule on both sites):
//   - licensing placeholders: brand mark, feature illustrations, fish-wheel sprites (each sprite box; the wheel rotates, so both sites' boxes are masked)
//   - other opaque fixed layers overlapping a section (sidebar, cookie, mobile menu bar; the hero
//     ticket layer is transparent and has flown away once scrolled, so it is never a mask)
// Per-section capture state (SECTION_STATE, identical on both sites, recorded in each tile's
// `state` and checked by pixel_parity.py): `hero` is captured with `cookie: dismissed`, i.e. the
// hero as a visitor sees it once the cookie banner is gone, in its own fresh page load so no other
// section's state changes. Dismissed = the banner root is hidden with display:none (the same CSS
// rule on both sites; the consent control is NOT clicked, so no consent is given on the live site)
// and the capture aborts unless the banner then has no rendered box. The banner is position:fixed
// on both sites, so hiding it changes no layout. The `cookie` section itself is still captured
// visible, in the main pass, exactly as before.
const modName = process.env.PLAYWRIGHT_MODULE || 'playwright'
const url = process.env.TARGET_URL, outDir = process.env.OUT_DIR, prefix = process.env.PREFIX
if (!url || !outDir || !prefix) { console.error('TARGET_URL, OUT_DIR and PREFIX are required'); process.exit(2) }
const freezeMs = Number(process.env.FREEZE_MS || 3000)
const _m = await import(modName)
const chromium = _m.chromium ?? _m.default.chromium
const fs = await import('node:fs')
const path = await import('node:path')
fs.mkdirSync(outDir, { recursive: true })

const ALL = [{ w: 1440, h: 900 }, { w: 1280, h: 800 }, { w: 390, h: 844 }]
const one = (process.env.VIEWPORT || '').match(/^(\d+)x(\d+)$/)
const VIEWPORTS = one ? [{ w: +one[1], h: +one[2] }] : ALL
const FIXED = {
  menu: '[class*="MobileMenu_root"], [class*="z-menu"]',
  sidebar: '[class*="SideBar_sidebar__"], aside',
  hero: '[class*="heroSlide_wrapper"], [class*="z-hero"]',
  cookie: '[class*="CookiePopup_wrapper"], [class*="z-cookie"]',
}
const SCROLLED = {
  mhero: '[class*="mobileHeroSection_root"], section[class*="desk:hidden"]',
  demo: '#demo-section',
  features: '#features-section',
  price: '#price-section',
  reviews: '#reviews-section',
  faq: '#faq-section',
  cta: '#faq-section + *',
}
const PLACEHOLDERS = [
  '[class*="SideBar_sidebar__"] button svg, aside button img',
  '[class*="mobileHeroSection_root"] svg, section[class*="desk:hidden"] img',
  '#features-section img',
  '[class*="FishVideo_wrapper"], #faq-section + * :has(> .fish-sprite)',
]

const SECTION_STATE = { hero: { cookie: 'dismissed' } }
const STATES = {
  cookie: {
    dismissed: async (page) => {
      await page.evaluate((sel) => {
        const st = document.createElement('style'); st.id = '__px_cookie_dismissed'
        st.textContent = sel.split(',').map((x) => x.trim() + '{display:none !important}').join('')
        document.head.appendChild(st)
      }, FIXED.cookie)
      await page.waitForTimeout(200)
      const left = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).length, FIXED.cookie)
      if (left) throw new Error(`cookie: dismissed not reached (${left} banner box(es) still rendered)`)
    },
  },
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
for (const vp of VIEWPORTS) {
  const phone = vp.w < 768
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: 90000 })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1500)
    await page.mouse.move(3, 3)
    return { ctx, page }
  }
  let { ctx, page } = await open()
  const loop = await page.evaluate(() => {
    const c = document.querySelector('[data-loop-scroll="container"]')
    return !!(c && getComputedStyle(c.parentElement).position === 'fixed')
  })
  const stabilise = async () => {
    let last = -1, stable = 0
    for (let i = 0; i < 80 && stable < 5; i++) {
      const n = await page.evaluate(() => document.body.innerText.length)
      stable = n === last ? stable + 1 : 0
      last = n
      await page.waitForTimeout(500)
    }
  }
  const freeze = async () => {
    await page.evaluate((ms) => {
      if (!document.getElementById('__px_freeze')) {
        const s = document.createElement('style'); s.id = '__px_freeze'
        s.textContent = '*,*::before,*::after{transition:none !important;caret-color:transparent !important}'
        document.head.appendChild(s)
      }
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.getComputedTiming()
        a.pause()
        if (t && t.endTime !== Infinity && t.endTime <= ms) a.finish()
        else a.currentTime = ms
      }
    }, freezeMs)
    await page.waitForTimeout(300)
  }
  const topOf = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : null }, sel)
  // bring the section top to viewport y = target by scrolling (never by jumping)
  const scrollTop = async (sel, target) => {
    for (let i = 0; i < 40; i++) {
      const t = await topOf(sel)
      if (t === null) return false
      const err = t - target
      if (Math.abs(err) < 0.75) return true
      if (loop) {
        await page.mouse.wheel(0, Math.max(-1200, Math.min(1200, err / 0.556)))
        await page.waitForTimeout(450)
      } else {
        const y = await page.evaluate(() => window.scrollY)
        const step = Math.max(-400, Math.min(400, err))
        await page.evaluate((v) => window.scrollTo(0, v), Math.round(y + step))
        await page.waitForTimeout(120)
      }
    }
    return Math.abs((await topOf(sel)) - target) < 2
  }
  const boxes = (sels) => page.evaluate((ss) => {
    const out = []
    for (const s of ss) for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none') out.push([r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10))
    }
    return out
  }, sels)
  const rectOf = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10) }, sel)
  const meta = { url, viewport: `${vp.w}x${vp.h}`, tiles: {} }
  const shot = async (name, tile, crop, maskSels, state) => {
    const file = `${prefix}${vp.w}_${name}_${tile}.png`
    await page.screenshot({ path: path.join(outDir, file) })
    meta.tiles[`${name}_${tile}`] = { file, crop, masks: await boxes(maskSels), ...(state ? { state } : {}) }
  }
  const visible = async (sel) => { const r = await rectOf(sel); return r && r[2] > 0 && r[3] > 0 ? r : null }

  // fixed layers at scroll 0 (after a scroll sweep so typewriters in them have run)
  await stabilise(); await freeze()
  // the hero ticket layer is transparent (no background), so it never masks another layer
  const othersOf = (name) => Object.entries(FIXED).filter(([n]) => n !== name && n !== 'hero' && !(name === 'hero' && n === 'sidebar')).map(([, s]) => s)
  for (const [name, sel] of Object.entries(FIXED)) {
    if (SECTION_STATE[name]) continue // captured below in its own page load
    const r = await visible(sel)
    if (!r) continue
    await shot(name, 0, r, [...PLACEHOLDERS, ...othersOf(name)])
  }
  // scrolled sections, reached by scrolling
  await page.evaluate(() => { const s = document.getElementById('__px_freeze'); if (s) s.remove(); for (const a of document.getAnimations()) a.play() })
  const fixedSels = Object.entries(FIXED).filter(([n]) => n !== 'hero').map(([, s]) => s)
  for (const [name, sel] of Object.entries(SCROLLED)) {
    const r0 = await visible(sel)
    if (!r0) continue
    const tiles = Math.max(1, Math.ceil(r0[3] / vp.h))
    for (let k = 0; k < tiles; k++) {
      const target = -k * vp.h
      await page.evaluate(() => { const s = document.getElementById('__px_freeze'); if (s) s.remove(); for (const a of document.getAnimations()) if (a.playState === 'paused') a.play() })
      if (!(await scrollTop(sel, target))) console.error(`warn: ${name} tile ${k} not settled`)
      await stabilise(); await scrollTop(sel, target); await freeze()
      const r = await rectOf(sel)
      const crop = [r[0], Math.max(0, r[1]), r[2], Math.min(vp.h, r[1] + r[3]) - Math.max(0, r[1])]
      await shot(name, k, crop, [...PLACEHOLDERS, ...fixedSels])
    }
  }
  // fixed layers with a capture state: fresh page load, apply the state, verify, then capture
  for (const [name, state] of Object.entries(SECTION_STATE)) {
    if (!FIXED[name]) throw new Error(`SECTION_STATE ${name}: only fixed layers take a capture state`)
    await ctx.close();
    ({ ctx, page } = await open())
    for (const [layer, value] of Object.entries(state)) await STATES[layer][value](page)
    await stabilise(); await freeze()
    const r = await visible(FIXED[name])
    if (!r) continue
    await shot(name, 0, r, [...PLACEHOLDERS, ...othersOf(name)], state)
  }
  fs.writeFileSync(path.join(outDir, `${prefix}${vp.w}.json`), JSON.stringify(meta, null, 1))
  console.error(`${prefix}${vp.w}: ${Object.keys(meta.tiles).length} tiles`)
  await ctx.close()
}
await browser.close()
