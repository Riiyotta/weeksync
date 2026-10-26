import { demo } from '../content.js'
import { addDays, dateKey, currentMonday } from './dates.js'

let uid = 0
export const newEntryId = () => `e${++uid}`

// entries[personId][dateKey] = [{ id, project, hours }]
export function buildSeedEntries() {
  const monday = currentMonday()
  const entries = {}
  demo.people.forEach((p) => (entries[p.id] = {}))
  Object.entries(demo.seed).forEach(([week, rows]) => {
    const weekStart = addDays(monday, Number(week) * 7)
    rows.forEach(([person, project, hours]) => {
      hours.forEach((h, i) => {
        if (!h) return
        const key = dateKey(addDays(weekStart, i))
        ;(entries[person][key] ||= []).push({ id: newEntryId(), project, hours: h })
      })
    })
  })
  return entries
}
