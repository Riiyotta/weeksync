import { useRef } from 'react'
import { useCursorTrail } from '../lib/motion.js'

// Dotted cursor trail overlay (spec 12.7). Rendered on desktop with (pointer: fine) only.
// useCursorTrail writes the path and toggles opacity (adds `!opacity-100`).
export default function CursorTrail() {
  const svgRef = useRef(null)
  const pathRef = useRef(null)
  useCursorTrail(svgRef, pathRef)
  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="fixed inset-0 w-screen h-screen pointer-events-none z-trail opacity-0 [transition:opacity_.18s_ease-out]"
    >
      <path ref={pathRef} className="trail-path" d="" />
    </svg>
  )
}
