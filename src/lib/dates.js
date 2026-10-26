const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dow = (d.getDay() + 6) % 7 // Mon = 0
  d.setDate(d.getDate() - dow)
  return d
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + n)
  return d
}

export function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// "26 Oct"
export function fmtDay(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// "26 Oct – 1 Nov"
export function fmtRange(a, b) {
  return `${fmtDay(a)} – ${fmtDay(b)}`
}

export function isWeekend(d) {
  const day = d.getDay()
  return day === 0 || day === 6
}

export const currentMonday = () => mondayOf(new Date())
