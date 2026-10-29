// Text-free computed-style geometry dump, the input of extraction/geometry_parity.py.
//
//   PLAYWRIGHT_MODULE=<path-to-playwright index.js, or a package name> \
//   TARGET_URL=https://weeksync.app/ OUT_FILE=o1440.fresh.n VIEWPORT=1440x900 \
//   node extraction/dump_geometry.mjs
//
// Run it once per site and viewport with the SAME script, so the comparison is like for like:
//   original: OUT_FILE=<dumps>/o<vp>.fresh.n   clone: OUT_FILE=<dumps>/c<vp>.fresh.n
// VIEWPORT is optional; without it all three recon viewports (1440x900, 1280x800, 390x844)
// are dumped and OUT_FILE must contain "{vp}" (e.g. o{vp}.fresh.n).
//   OUT_FILE   output path, "{vp}" is replaced by the viewport width
//   CHROMIUM_PATH (optional) browser executable
//   FREEZE_MS  (optional, default 3000) Web Animations currentTime for looping animations
//
// No machine paths live in this file. Format (reverse-engineered from the recon dumps):
//   VIEW <w>x<h> rem=<root font-size px>
//   ## <section> root x,y,w,h bg=<colour>      (page coordinates at scroll 0), or "## <section> MISSING"
//   <kind> x,y,w,h [| style ...]               (box relative to the section root, rounded to 0.1px)
// A row is written for every rendered, visible (opacity > 0) descendant (outside <svg>) that is
// an a/button/svg/img/input/heading/li/media element, or has its own text node, a background
// colour, a border or a radius. Opacity (when != 1) and pure-translate transforms are only
// annotated, they never qualify an element. Text content itself is never written. The style suffix
// is "font size/line-height wWeight lsSpacing [italic] colour ta=align [td=...]" (only for elements
// with their own text, li and headings), then bg=, bd=, rad=, op=, tf= segments.
// The same selector lists work on the original (CSS-module class names) and on the clone
// (tailwind classes / data attributes): each entry is "original selector, clone selector".
//
// Determinism, applied identically to whichever site is dumped:
//   1. fresh browser context per viewport (390: isMobile + hasTouch; no stored consent, device scale factor 1: computed border
//      widths are snapped to whole px, unlike the retina recon dumps), pointer parked at (3,3)
//   2. the demo (it autoplays once scrolled into view) is dumped first, at pristine load, then the page
//      is swept top to bottom (wheel on the loop scroller on desktop, scrollTo on mobile) so the scroll-
//      triggered typewriters run, and returned to scroll 0 (loop scroller: 0 or wrapH, y normalised)
//   3. wait until the rendered text length is unchanged for 2.5 s (typewriters finished)
//   4. every Web Animation / CSS animation is paused: infinite ones at currentTime = FREEZE_MS
//      (half of the 6 s mobile oval loop), finite ones finished; CSS transitions are switched off
// Not captured on purpose: typewriter text that is out of view resets in the original, so wrapper boxes
// (which keep their final layout through an invisible twin) are what is compared, not typed characters.
const modName = process.env.PLAYWRIGHT_MODULE || 'playwright'
const url = process.env.TARGET_URL
const outFile = process.env.OUT_FILE
if (!url || !outFile) {
  console.error('TARGET_URL and OUT_FILE are required')
  process.exit(2)
}
const freezeMs = Number(process.env.FREEZE_MS || 3000)
const _m = await import(modName)
const chromium = _m.chromium ?? _m.default.chromium
const fs = await import('node:fs')

const ALL = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 390, h: 844 },
]
const one = (process.env.VIEWPORT || '').match(/^(\d+)x(\d+)$/)
const VIEWPORTS = one ? [{ w: +one[1], h: +one[2] }] : ALL

const SECTIONS = [
  ['menu', '[class*="MobileMenu_root"], [class*="z-menu"]'],
  ['sidebar', '[class*="SideBar_sidebar__"], aside'],
  ['hero', '[class*="heroSlide_wrapper"], [class*="z-hero"]'],
  ['mhero', '[class*="mobileHeroSection_root"], section[class*="desk:hidden"]'],
  ['demo', '#demo-section'],
  ['dctl', '[class*="DemoControls_controls"], [data-demo-controls]'],
  ['features', '#features-section'],
  ['price', '#price-section'],
  ['reviews', '#reviews-section'],
  ['faq', '#faq-section'],
  ['cta', '#faq-section + *'],
  ['cookie', '[class*="CookiePopup_wrapper"], [class*="z-cookie"]'],
]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
for (const vp of VIEWPORTS) {
  // phone widths are emulated as a touch phone (isMobile/hasTouch), like the 390 recon capture
  const phone = vp.w < 768
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load', timeout: 90000 })
  await page.waitForTimeout(1500)
  const STEP = 300
  const loop = await page.evaluate(() => {
    const c = document.querySelector('[data-loop-scroll="container"]')
    const wrap = document.querySelector('[data-loop-scroll="wrap"]')
    return c && wrap && getComputedStyle(c.parentElement).position === 'fixed' ? { wrapH: wrap.offsetHeight } : null
  })
  const loopY = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-loop-scroll="container"]')).transform).m42)
  const stabilise = async () => {
    // wait for typewriters / loaders: rendered text length stable for 2.5 s
    let last = -1, stable = 0
    for (let i = 0; i < 80 && stable < 5; i++) {
      const n = await page.evaluate(() => document.body.innerText.length)
      stable = n === last ? stable + 1 : 0
      last = n
      await page.waitForTimeout(500)
    }
  }
  const freeze = async () => {
    await page.mouse.move(3, 3)
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none !important}' })
    await page.evaluate((ms) => {
      window.scrollTo(0, 0)
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.getComputedTiming()
        a.pause()
        if (t && t.endTime !== Infinity && t.endTime <= ms) a.finish()
        else a.currentTime = ms
      }
    }, freezeMs)
    await page.waitForTimeout(300)
  }
  const sweep = async () => {
    if (loop) {
      await page.mouse.move(3, 3) // park the pointer on the sidebar edge: no hover state on demo cells / cards
      const steps = Math.floor((loop.wrapH - vp.h) / STEP)
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, STEP); await page.waitForTimeout(150) }
      await page.waitForTimeout(1500)
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, -STEP); await page.waitForTimeout(60) }
      // the loop scroller is lerp-smoothed and wraps at wrapH: settle onto 0 (or wrapH, same place)
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(700)
        const pos = -(await loopY())
        const delta = pos > loop.wrapH / 2 ? Math.ceil(loop.wrapH - pos) : -Math.round(pos)
        if (Math.abs(delta) < 1 && (pos < 1 || loop.wrapH - pos < 1)) break
        await page.mouse.wheel(0, delta === 0 ? 1 : delta)
      }
    } else {
      const total = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < total; y += STEP) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(150) }
      await page.waitForTimeout(1500)
      await page.evaluate(() => window.scrollTo(0, 0))
    }
  }
  const dump = async (names) => {
    // the loop scroller may rest on wrapH instead of 0 (same place): report page y as if at 0
    const yShift = loop && -(await loopY()) > loop.wrapH / 2 ? loop.wrapH : 0
    return page.evaluate(({ sections, w, h, yShift }) => {
    const r1 = (x) => Math.round(x * 10) / 10
    const px = (v) => r1(parseFloat(v))
    const KEEP = new Set(['A', 'BUTTON', 'SVG', 'IMG', 'INPUT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'VIDEO', 'CANVAS', 'SELECT', 'TEXTAREA'])
    const rem = Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 100000) / 100000
    const lines = []
    for (const [name, sel] of sections) {
      const root = document.querySelector(sel)
      if (!root) { lines.push(`## ${name} MISSING`); continue }
      const rr = root.getBoundingClientRect()
      const rcs = getComputedStyle(root)
      lines.push(`## ${name} root ${[rr.x, rr.y + yShift, rr.width, rr.height].map(r1).join(',')} bg=${rcs.backgroundColor}`)
      for (const el of root.querySelectorAll('*')) {
        if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
        if (el.getClientRects().length === 0) continue
        const cs = getComputedStyle(el)
        const tag = el.tagName.toLowerCase()
        // text block: own text node, or an element wrapping only inline children that carry text
        // (typewriter wrappers: the typed span may still be empty, its hidden twin keeps the layout)
        const ownText =
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ||
          (el.children.length > 0 && el.textContent.trim() !== '' && [...el.children].every((k) => getComputedStyle(k).display === 'inline'))
        const bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : ''
        const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs['border' + s + 'Width']))
        const hasBd = bw.some((v) => v > 0)
        const rad = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => cs['border' + c + 'Radius'])
        const hasRad = rad.some((v) => parseFloat(v) > 0)
        const op = parseFloat(cs.opacity)
        const tm = cs.transform.match(/^matrix\(1, 0, 0, 1, (-?[\d.]+), (-?[\d.]+)\)$/)
        const tf = tm && (parseFloat(tm[1]) || parseFloat(tm[2])) ? cs.transform : '' // pure non-zero translate only (menu overlay)
        if (op === 0 || cs.visibility === 'hidden') continue // invisible layout twins (typewriter sizers, cursors)
        if (!(KEEP.has(el.tagName.toUpperCase()) || ownText || bg || hasBd || hasRad)) continue
        const r = el.getBoundingClientRect()
        const kind = ['div', 'p', 'span'].includes(tag) ? 'T' : tag
        const seg = []
        if (ownText || tag === 'li' || /^h[1-6]$/.test(tag)) {
          const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
          const lh = cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight)
          const ls = cs.letterSpacing === 'normal' ? 'normal' : px(cs.letterSpacing)
          let f = `${fam} ${px(cs.fontSize)}/${lh} w${cs.fontWeight} ls${ls}${cs.fontStyle === 'italic' ? ' italic' : ''} ${cs.color} ta=${cs.textAlign}`
          if (cs.textDecorationLine !== 'none') {
            const th = cs.textDecorationThickness, off = cs.textUnderlineOffset
            f += ` td=${cs.textDecorationLine}/${cs.textDecorationStyle}/${th === 'auto' ? 'auto' : px(th)}/${off === 'auto' ? 'auto' : px(off)}`
          }
          seg.push(f)
        }
        if (bg) seg.push(`bg=${bg}`)
        if (hasBd) seg.push(`bd=${bw.join('/')} ${cs.borderTopStyle} ${cs.borderTopColor}`)
        if (hasRad) seg.push(`rad=${rad.every((v) => v === rad[0]) ? (rad[0].endsWith('%') ? rad[0] : px(rad[0])) : rad.map((v) => px(v)).join(' ')}`)
        if (op !== 1) seg.push(`op=${Number(op.toPrecision(6))}`)
        if (tf) seg.push(`tf=${tf}`)
        lines.push(`${kind} ${[r.x - rr.x, r.y - rr.y, r.width, r.height].map(r1).join(',')}${seg.length ? ' | ' + seg.join(' | ') : ''}`)
      }
    }
    return { rem, lines }
  }, { sections: SECTIONS.filter(([n]) => names.includes(n)), w: vp.w, h: vp.h, yShift })
  }

  // phase 1: the demo autoplays when it scrolls into view, so its pristine load state is dumped before
  // any scrolling. phase 2: everything else after a full scroll sweep (typewriters/reveals have run).
  await stabilise()
  await freeze()
  const early = await dump(['demo', 'dctl'])
  await sweep()
  await stabilise()
  await freeze()
  const late = await dump(SECTIONS.map(([n]) => n).filter((n) => n !== 'demo' && n !== 'dctl'))
  const byName = {}
  for (const part of [early, late]) {
    let cur = null
    for (const l of part.lines) { if (l.startsWith('## ')) { cur = l.split(' ')[1]; byName[cur] = [] } byName[cur].push(l) }
  }
  const text = `VIEW ${vp.w}x${vp.h} rem=${late.rem}px\n` + SECTIONS.map(([n]) => byName[n].join('\n')).join('\n') + '\n'
  const target = outFile.replace('{vp}', String(vp.w))
  fs.writeFileSync(target, text)
  console.error(`wrote ${target}: ${text.split('\n').length - 1} lines`)
  await ctx.close()
}
await browser.close()
