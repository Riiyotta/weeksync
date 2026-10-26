// Motion hooks. Every constant below was read from the live original's bundle and checked
// with rAF samplers (see the Animation hand-off notes).
import { useEffect, useRef, useState } from 'react'
import { LOOP_PROGRESS } from './loopEvents.js'

export { useDemoBotCursors, bindBotCursor, markUserMoved, setUserDragging } from './botCursors.js'

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const MOBILE_QUERY = '(max-width: 1023px)'

// ---------------------------------------------------------------------------
// Hero ticket + scissors (spec 4.3). distance .2; steps .3/.3/.45/.55/.7/.7.
// `ap` is batched to one update per animation frame, like the original.
const HERO_DISTANCE = 0.2
const STEP1 = 0.3
const STEP3 = 0.45
const STEP4 = 0.55
const STEP5 = 0.7
const STEP6 = 0.7
// Zipper pull is shown in [step2, step3 + .4*(step4-step3)) = [.3, .49), scissors in [.49, .7].
const ZIP_END = STEP3 + 0.4 * (STEP4 - STEP3)

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

export function useHeroMotion() {
  const [ap, setAp] = useState(0.5)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const vp = useViewport()

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const on = () => {
      setIsMobile(mql.matches)
      setAp(0.5)
    }
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    let pending = null
    let raf = null
    const onProgress = (e) => {
      if (isMobile) return
      const c = e.detail?.cycleProgress
      if (typeof c !== 'number') return
      const start = 1 - HERO_DISTANCE
      const n = 1 - (((c % 1) + 1) % 1)
      pending =
        n >= start && n <= 1 ? (n - start) / HERO_DISTANCE / 2 : n >= 0 && n <= HERO_DISTANCE ? n / HERO_DISTANCE / 2 + 0.5 : 0
      if (raf === null) {
        raf = requestAnimationFrame(() => {
          if (pending !== null) setAp(pending)
          pending = null
          raf = null
        })
      }
    }
    window.addEventListener(LOOP_PROGRESS, onProgress)
    return () => {
      window.removeEventListener(LOOP_PROGRESS, onProgress)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [isMobile])

  // Ticket
  const t = ap <= STEP1 ? (ap / STEP1) * 0.5 : ap >= STEP6 ? 0.5 + (0.5 * (ap - STEP6)) / (1 - STEP6) : 0.5
  const r2 = (x) => Math.round(x * 100) / 100
  const rotate = r2((0.5 - t) * 24)
  const tx = r2(((2 * Math.abs(t - 0.5) * 20) / 100) * vp.w)
  const ty = r2((((0.5 - t) * 300) / 100) * vp.h)

  // Scissors
  const f = clamp01((ap - STEP1) / (STEP3 - STEP1))
  const v = clamp01((ap - STEP4) / (STEP5 - STEP4))
  const T = ap < STEP1 ? 0 : ap <= STEP3 ? f : ap < STEP4 ? 1 : ap <= STEP5 ? 1 - v : 0
  let opacity = 1
  if (ap < STEP1 || ap > STEP5) opacity = 0
  else if (ap <= STEP3) opacity = f <= 0.1 ? 0 : f < 0.15 ? (f - 0.1) / 0.05 : 1
  else if (ap >= STEP4) opacity = v >= 0.9 ? 0 : v > 0.85 ? (0.9 - v) / 0.05 : 1
  const bladeOpen = ap >= STEP4 && ap <= STEP5 ? (1 + Math.sin(10 * v * 2 * Math.PI)) / 2 : 1

  return {
    ticketTransform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg) translateZ(0)`,
    ticketHidden: t === 0 || t === 1,
    T,
    opacity,
    bladeOpen,
    showZipper: ap >= STEP1 && ap < ZIP_END,
    showScissors: ap >= ZIP_END && ap <= STEP5,
  }
}

// Zipper pull handle: follows the mouse, eased 40% per frame, clamped to a 300deg range
// (the 150-210deg wedge pointing up is excluded). Initial angle -45deg.
const wrap360 = (a) => ((a % 360) + 360) % 360
export function useZipperPull(boxRef, handleRef) {
  useEffect(() => {
    let cur = wrap360(wrap360(-45) - 210)
    let target = cur
    let raf = 0
    const onMove = (e) => {
      const box = boxRef.current
      if (!box) return
      const r = box.getBoundingClientRect()
      const w = 0.9 * r.width
      const h = 1.8 * r.height
      const cx = r.left + 0.04 * r.width + 0.5 * w
      const cy = r.top + 0.3 * r.height + 0.25 * h
      let a = wrap360((180 / Math.PI) * Math.atan2(-(e.clientX - cx), e.clientY - cy))
      if (a >= 150 && a <= 210) a = a - 150 <= 210 - a ? 150 : 210
      target = wrap360(a - 210)
    }
    const tick = () => {
      const d = target - cur
      if (Math.abs(d) > 0.01) {
        cur = Math.max(0, Math.min(300, cur + 0.4 * d))
        const deg = wrap360(cur + 210)
        if (handleRef.current) handleRef.current.style.transform = `rotate(${deg > 180 ? deg - 360 : deg}deg)`
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [boxRef, handleRef])
}

// ---------------------------------------------------------------------------
// TypewriterText (spec 12.3). IntersectionObserver threshold .3. Entering: wait `delay`,
// then setInterval(speed) reveals one char per tick (first char at delay + speed).
// Leaving: clear timers and reset to 0. Initial render is empty, as on the original.
export const TYPE_SPEEDS = { fast: 15, normal: 30, slow: 50 }
export function useTypewriter(ref, text, { speed = 'normal', delay = 0 } = {}) {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const countRef = useRef(0)
  const interval = TYPE_SPEEDS[speed] || TYPE_SPEEDS.normal

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])

  useEffect(() => {
    let timeout = null
    let iv = null
    if (visible) {
      if (countRef.current >= text.length) {
        countRef.current = 0
        setCount(0)
      }
      timeout = setTimeout(() => {
        iv = setInterval(() => {
          countRef.current += 1
          setCount(countRef.current)
          if (countRef.current >= text.length) {
            clearInterval(iv)
            iv = null
          }
        }, interval)
      }, delay)
    } else {
      countRef.current = 0
      setCount(0)
    }
    return () => {
      clearTimeout(timeout)
      clearInterval(iv)
    }
  }, [visible, text, interval, delay])

  return Math.min(count, text.length)
}

// ---------------------------------------------------------------------------
// Fish wheel (spec 12.5). Outer: rotate((360*c % 360 + 360) % 360). Inner: 18deg/s * dir via
// rAF; dir = +1 when cycleProgress increases (scrolling up), -1 when it decreases, updated
// only when cycleProgress moved >= .01 since the last recorded value. Initial dir +1.
export function useFishWheel(outerRef, innerRef) {
  useEffect(() => {
    let dir = 1
    let lastC = 0
    let angle = 0
    let lastTs = null
    let raf = 0
    const tick = (ts) => {
      if (lastTs === null) lastTs = ts
      const dt = (ts - lastTs) / 1000
      lastTs = ts
      angle = (((angle + 18 * dir * dt) % 360) + 360) % 360
      if (innerRef.current) innerRef.current.style.transform = `rotate(${angle}deg)`
      raf = requestAnimationFrame(tick)
    }
    const onProgress = (e) => {
      const c = e.detail?.cycleProgress
      if (typeof c !== 'number') return
      if (outerRef.current) outerRef.current.style.transform = `rotate(${(((360 * c) % 360) + 360) % 360}deg)`
      const d = c - lastC
      if (Math.abs(d) < 0.01) return
      lastC = c
      dir = d > 0 ? 1 : -1
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener(LOOP_PROGRESS, onProgress)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(LOOP_PROGRESS, onProgress)
    }
  }, [outerRef, innerRef])
}

// Fish sprite frame scrub (spec 12.5, direction read from the live bundle). Frame starts at 0.
// When the scroll direction changes (|dc| >= .01): scrolling down (cycleProgress decreasing)
// plays toward frame 28, scrolling up toward 0; 28 frames per 800ms, linear, rounded.
export function useFishFrame() {
  const [frame, setFrame] = useState(0)
  const frameRef = useRef(0)
  useEffect(() => {
    let raf = 0
    let lastC = 0
    let lastDir = 0
    const play = (direction) => {
      cancelAnimationFrame(raf)
      const startFrame = frameRef.current
      let start = null
      const step = (ts) => {
        if (start === null) start = ts
        const p = Math.min((ts - start) / 800, 1)
        const d = 28 * p
        const fr = direction === 1 ? Math.min(startFrame + d, 28) : Math.max(startFrame - d, 0)
        const rounded = Math.round(fr)
        frameRef.current = rounded
        setFrame(rounded)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const onProgress = (e) => {
      const c = e.detail?.cycleProgress
      if (typeof c !== 'number') return
      const d = c - lastC
      if (Math.abs(d) < 0.01) return
      lastC = c
      const dir = d > 0 ? -1 : 1
      if (dir !== lastDir) {
        lastDir = dir
        play(dir)
      }
    }
    window.addEventListener(LOOP_PROGRESS, onProgress)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(LOOP_PROGRESS, onProgress)
    }
  }, [])
  return frame
}

// ---------------------------------------------------------------------------
// Cursor trail (spec 12.7). (pointer: fine) only. Every pointermove is kept for 200ms;
// each frame writes "M x y L x y ..." (1 decimal) and toggles visibility at >= 2 points.
export function useCursorTrail(svgRef, pathRef) {
  useEffect(() => {
    if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return
    let points = []
    let shown = false
    let lastD = ''
    let raf = 0
    const onMove = (e) => {
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    }
    const tick = () => {
      const now = performance.now()
      points = points.filter((p) => now - p.t <= 200)
      if (points.length < 2) {
        if (shown) {
          shown = false
          svgRef.current?.classList.remove('!opacity-100')
          lastD = ''
          pathRef.current?.setAttribute('d', '')
        }
      } else {
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
        if (d !== lastD) {
          lastD = d
          pathRef.current?.setAttribute('d', d)
        }
        if (!shown) {
          shown = true
          svgRef.current?.classList.add('!opacity-100')
        }
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [svgRef, pathRef])
}

// ---------------------------------------------------------------------------
// Smooth loop scroll (spec 12.1). Shortest-path `delta` is computed by the caller.
// Returns a stepper called once per scroller frame (before render): it returns the
// incremental px to apply this frame, or null once finished. easeInOutQuad over 1600ms.
// |delta| < 1 returns null (caller jumps instantly, like the original's setProgress).
export function startSmoothScroll({ delta, duration = 1600 }) {
  if (!isFinite(delta) || Math.abs(delta) < 1 || duration <= 0) return null
  const start = performance.now()
  let traveled = 0
  let done = false
  return () => {
    if (done) return null
    const t = clamp01((performance.now() - start) / duration)
    const eased = delta * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const step = eased - traveled
    traveled = eased
    if (t >= 1) done = true
    return step
  }
}
