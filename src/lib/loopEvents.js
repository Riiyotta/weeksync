// Custom window events used by the loop scroller (spec 12.1).
export const LOOP_PROGRESS = 'loopscroll:progress' // detail: { progress, cycleProgress }
export const LOOP_SCROLL_TO = 'loopscroll:scrollTo' // detail: { progressPx, smooth }
export const LOOP_CONTENT_RESIZE = 'loopscroll:contentResize'

export const DESKTOP_MIN = 1024

export function notifyContentResize() {
  window.dispatchEvent(new CustomEvent(LOOP_CONTENT_RESIZE))
}

// Scroll to a section id. Desktop: compute the section offset inside the primary wrap and
// ask the loop scroller to move there (progressPx is the target wrapped position, i.e.
// -offsetTop within the wrap). Mobile: native scroll.
// As on the original, the offset is measured from the page root (the wrap's first child,
// the original's #landing-wrapper) minus that root's computed padding-top (15rem =
// --landing-padding-section), so it scales with the root font-size at every width.
export function scrollToSection(id, { smooth } = {}) {
  const wrap = document.querySelector('[data-loop-scroll="wrap"]')
  if (window.innerWidth >= DESKTOP_MIN && wrap) {
    const el = wrap.querySelector(`[id="${id}"]`)
    if (!el) return
    const root = wrap.firstElementChild || wrap
    const pad = parseFloat(getComputedStyle(root).paddingTop) || 0
    const offset = Math.max(0, el.getBoundingClientRect().top - root.getBoundingClientRect().top - pad)
    window.dispatchEvent(new CustomEvent(LOOP_SCROLL_TO, { detail: { progressPx: -offset, smooth } }))
  } else {
    document.getElementById(id)?.scrollIntoView()
  }
}
