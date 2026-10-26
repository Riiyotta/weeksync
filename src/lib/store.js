// Module-level stores shared by both loop copies (wrap + wrap-clone), spec 0.1.
// Demo data, Days/Weeks view, period offset and the open FAQ item stay in sync.
import { useSyncExternalStore } from 'react'
import { buildSeedEntries } from './demoData.js'

function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? next(state) : next
      listeners.forEach((l) => l())
    },
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

// Selectors must return stable references (a slice of state, not a new object).
export function useStore(store, selector = (s) => s) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}

// FAQ: single-open, item 1 (index 0) open on load. null = all closed.
export const faqStore = createStore({ open: 0 })

// Demo calendar.
// view: 'days' | 'weeks'; offset: week offset from the visitor's current week.
// carriedId: entry currently carried by a bot cursor (opacity .4), set by the Animation pass.
export const demoStore = createStore({
  view: 'days',
  offset: 0,
  entries: buildSeedEntries(),
  carriedId: null,
})
