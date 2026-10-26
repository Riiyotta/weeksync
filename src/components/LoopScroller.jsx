import { useEffect, useRef } from 'react'
import { LOOP_PROGRESS, LOOP_SCROLL_TO, LOOP_CONTENT_RESIZE } from '../lib/loopEvents.js'
import { startSmoothScroll } from '../lib/motion.js'

// Infinite loop scroller (spec 0.1, 12.1). Desktop only: renders the page twice
// (wrap + wrap-clone) inside a fixed root and translates the container.
// On mobile (enabled=false) the root is position:relative and the page scrolls natively;
// the clone is not rendered.
const SPEED_FACTOR = 0.25
const FRICTION = 0.55
const REMEASURE_EVERY = 500
const TOUCH_STEP_CLAMP = 50

export default function LoopScroller({ enabled, children }) {
  const containerRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const wrap = wrapRef.current
    if (!enabled || !container || !wrap) {
      if (container) container.style.transform = ''
      return
    }

    let H = wrap.offsetHeight || 1
    let pos = 0 // wrapped position, in (-H, 0]
    let progress = 0 // cumulative (unwrapped), negative when scrolling down
    let velocity = 0
    let lastEmitted = null
    let sinceMeasure = 0
    let raf = 0
    let smoothStep = null // active smooth scrollTo stepper (cancelled by wheel / touch)

    const measure = () => {
      H = wrap.offsetHeight || 1
      sinceMeasure = 0
    }

    const move = (delta) => {
      pos += delta
      progress += delta
      sinceMeasure += Math.abs(delta)
      if (sinceMeasure >= REMEASURE_EVERY) measure()
      while (pos < -H) pos += H
      while (pos > 0) pos -= H
    }

    const emit = () => {
      if (lastEmitted !== null && Math.abs(progress - lastEmitted) < 1) return
      lastEmitted = progress
      window.dispatchEvent(
        new CustomEvent(LOOP_PROGRESS, { detail: { progress, cycleProgress: progress / H } }),
      )
    }

    const render = () => {
      container.style.transform = `translate3d(0, ${pos}px, 0)`
    }

    const tick = () => {
      if (smoothStep) {
        const step = smoothStep()
        if (step === null) smoothStep = null
        else move(step)
      } else if (velocity !== 0) {
        move(velocity)
        velocity *= FRICTION
        if (Math.abs(velocity) < 0.001) velocity = 0
      }
      render()
      emit()
      raf = requestAnimationFrame(tick)
    }

    const onWheel = (e) => {
      smoothStep = null
      velocity += -e.deltaY * SPEED_FACTOR
    }

    // Touch: direct follow (each step clamped to +-50px) with fling from the last 10 samples.
    let touchY = null
    let samples = []
    const onTouchStart = (e) => {
      smoothStep = null
      touchY = e.touches[0].clientY
      samples = []
      velocity = 0
    }
    const onTouchMove = (e) => {
      if (touchY === null) return
      const y = e.touches[0].clientY
      const dy = Math.max(-TOUCH_STEP_CLAMP, Math.min(TOUCH_STEP_CLAMP, y - touchY))
      touchY = y
      move(dy)
      samples.push(dy)
      if (samples.length > 10) samples.shift()
    }
    const onTouchEnd = () => {
      if (samples.length) velocity = samples.reduce((a, b) => a + b, 0) / samples.length
      touchY = null
      samples = []
    }

    const onScrollTo = (e) => {
      const { progressPx = 0, smooth } = e.detail || {}
      measure()
      let delta = progressPx - pos
      // shortest path around the loop
      delta = ((((delta + H / 2) % H) + H) % H) - H / 2
      velocity = 0
      smoothStep = null
      // Smooth: 1600ms easeInOutQuad, stepped inside the frame loop (before render).
      if (smooth === true) {
        smoothStep = startSmoothScroll({ delta })
        if (smoothStep) return
      }
      move(delta)
    }

    const onResize = () => measure()

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener(LOOP_SCROLL_TO, onScrollTo)
    window.addEventListener(LOOP_CONTENT_RESIZE, measure)
    window.addEventListener('resize', onResize)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener(LOOP_SCROLL_TO, onScrollTo)
      window.removeEventListener(LOOP_CONTENT_RESIZE, measure)
      window.removeEventListener('resize', onResize)
      container.style.transform = ''
    }
  }, [enabled])

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden mob:relative mob:h-auto mob:overflow-visible">
      <div
        ref={containerRef}
        data-loop-scroll="container"
        className="absolute top-0 left-0 w-full will-change-transform [transform:translateZ(0)] [backface-visibility:hidden]"
      >
        <div ref={wrapRef} data-loop-scroll="wrap" className="relative w-full">
          {children}
        </div>
        {enabled && (
          <div data-loop-scroll="wrap-clone" className="relative w-full">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
