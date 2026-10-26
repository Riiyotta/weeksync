import { useRef } from 'react'
import { useTypewriter } from '../lib/motion.js'

// Spec 1.4 / 12.3: <tag><span visible>{typed}</span><span opacity 0>{rest}</span></tag>.
// The full text always reserves its final layout.
// Typing is driven by useTypewriter (src/lib/motion.js): starts empty, types at 30% visibility.
export default function TypewriterText({ as: Tag = 'p', text, speed = 'normal', delay = 0, className = '' }) {
  const ref = useRef(null)
  const count = useTypewriter(ref, text, { speed, delay })
  return (
    <Tag ref={ref} className={`relative ${className}`}>
      <span className="opacity-100">{text.slice(0, count)}</span>
      <span className="opacity-0">{text.slice(count)}</span>
    </Tag>
  )
}
