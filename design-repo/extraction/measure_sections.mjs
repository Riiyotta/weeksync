// Optional re-measure tool for extraction/measured-values.json -> sectionHeights.
//
//   PLAYWRIGHT_MODULE=<path-to-playwright-package-or-name> \
//   CLONE_URL=http://localhost:5175/ node extraction/measure_sections.mjs > heights.json
//
// No machine paths live in this file: the Playwright module location, the browser
// executable (CHROMIUM_PATH, optional) and the clone URL all come from env vars.
// Measures the running clone at 1440x900, 1280x800 and 390x844 (the same viewports
// as the recon dumps) and prints JSON. Desktop (>=1024) measures the primary loop
// wrap only (the wrap-clone is a duplicate); fixed layers are reported separately
// because they take no page height.
const modName = process.env.PLAYWRIGHT_MODULE || 'playwright'
const url = process.env.CLONE_URL || 'http://localhost:5175/'
const { chromium } = await import(modName)

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 390, h: 844 },
]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const out = { url, measuredAt: new Date().toISOString(), viewports: {} }
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  out.viewports[`${vp.w}x${vp.h}`] = await page.evaluate(() => {
    const r1 = (x) => Math.round(x * 10) / 10
    const wrap = document.querySelector('[data-loop-scroll="wrap"]')
    const clone = document.querySelector('[data-loop-scroll="wrap-clone"]')
    const column = wrap.firstElementChild.firstElementChild
    const wrapTop = wrap.getBoundingClientRect().top
    const label = (el, i) => {
      if (el.id) return el.id
      const inner = el.querySelector('[id]')
      if (inner && el.tagName === 'SECTION') return `section>${inner.id}`
      if (el.querySelector('.fish-sprite')) return 'cta-footer'
      return i === 0 ? 'hero-spacer' : 'tail-spacer'
    }
    const inFlow = [...column.children].map((el, i) => {
      const r = el.getBoundingClientRect()
      return { key: label(el, i), tag: el.tagName.toLowerCase(), top: r1(r.top - wrapTop), height: r1(r.height) }
    })
    const fixedSel = {
      sidebar: 'aside',
      heroTicket: '.z-hero',
      cookie: '.z-cookie',
      cursorTrail: 'svg.z-trail',
      mobileMenu: '.z-menu',
    }
    const fixed = {}
    for (const [k, sel] of Object.entries(fixedSel)) {
      const el = document.querySelector(sel)
      if (!el) { fixed[k] = null; continue }
      const r = el.getBoundingClientRect()
      fixed[k] = { position: getComputedStyle(el).position, height: r1(r.height), display: getComputedStyle(el).display }
    }
    const mhero = document.querySelector('section.desk\\:hidden, section[class*="desk:hidden"]')
    return {
      rootFontSizePx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      wrapHeight: r1(wrap.getBoundingClientRect().height),
      wrapCloneRendered: !!clone,
      wrapCloneHeight: clone ? r1(clone.getBoundingClientRect().height) : null,
      bodyOverflow: getComputedStyle(document.body).overflow,
      mobileHeroHeight: mhero && getComputedStyle(mhero).display !== 'none' ? r1(mhero.getBoundingClientRect().height) : null,
      inFlow,
      fixed,
    }
  })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(out, null, 1))
