// Simple UI icons redrawn per spec section 13 (stroke/fill currentColor).

export function ChevronLeft(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="M7.25 10.5L2.75 5.9945L7.25 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRight(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="M4.75 1.5L9.25 6.0055L4.75 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="M6 2.125V9.875M2.125 6H9.875" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="M2.73 2.73L9.27 9.27M9.27 2.73L2.73 9.27" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
    </svg>
  )
}

export function BotArrow(props) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" {...props}>
      <path d="M1.5 1.5L10.5 5L5 10.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// Scissors blade: 14x42, tapered 2-wide bar with a ring (outer r6 / inner r4) centered at (7,35).
export function Blade(props) {
  return (
    <svg viewBox="0 0 14 42" fill="none" aria-hidden="true" {...props}>
      <path d="M6 29V2a1 1 0 0 1 2 0V29Z" fill="currentColor" />
      <circle cx="7" cy="35" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
