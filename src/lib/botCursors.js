// Demo "bot cursors" (spec 5.5). A port of the original's engine rules, adapted to the
// clone's demoStore shape (entries[person][dateKey] = [{ id, project, hours }]).
// One engine is shared by every registered demo frame (both loop copies); it runs on the
// frame with the largest intersection ratio >= .3 and cursors render in every frame at the
// same rem coordinates. Paths are random (as on the original); timing ranges are exact.
import { useEffect, useSyncExternalStore } from 'react'
import { demo } from '../content.js'
import { demoStore } from './store.js'
import { newEntryId } from './demoData.js'
import { addDays, currentMonday, dateKey } from './dates.js'

// --- constants (from the original bundle) ----------------------------------------------
const BOW = { min: 0.04, max: 0.16 } // perpendicular bow, fraction of distance
const OVERSHOOT = { min: 3, max: 9 }
const SETTLE = { min: 130, max: 220 }
const JITTER = { x: 6, y: 4 }
const JITTER_MS = { min: 600, max: 1200 }
const WAIT = { min: 700, max: 1800 }
const PRE_PRESS = { min: 120, max: 300 }
const PRESS = { min: 90, max: 150 }
const POST_RELEASE = { min: 150, max: 350 }
const DRAG_SLOWDOWN = 1.35
const START_STAGGER = 600 // Mia 600, Leo 1200, Sofia 1800
const USER_PAUSE = 2500
const RECENT_USER_MOVE = 20000

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sleepRange = (r) => sleep(rand(r.min, r.max))

const PEOPLE = demo.people.map((p) => p.id)
const PROJECTS = demo.projects.map((p) => p.id)
const BOTS = demo.people.map((p) => ({ id: p.id, name: p.cursorName || p.name.split(' ')[0] }))

// --- date helpers on 'YYYY-MM-DD' strings ---------------------------------------------
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addD = (s, n) => dateKey(addDays(parse(s), n))
const isWeekendKey = (s) => [0, 6].includes(parse(s).getDay())
const mondayKey = (s) => {
  const d = parse(s)
  return dateKey(addDays(d, -((d.getDay() + 6) % 7)))
}
const viewKey = (view, s) => (view === 'days' ? s : mondayKey(s))
const daysOf = (view, s) => Array.from({ length: view === 'days' ? 1 : 7 }, (_, i) => addD(s, i))
const capacity = (s) => (isWeekendKey(s) ? 0 : demo.dayCapacity)
const cellKey = (person, date) => `${person}|${date}`
const entryCell = (e) => cellKey(e.personId, e.date)
const sumHours = (list) => list.reduce((a, e) => a + e.hours, 0)
const inRange = (entries, view, person, start) => {
  const end = addD(start, view === 'days' ? 1 : 7)
  return entries.filter((e) => e.personId === person && e.date >= start && e.date < end)
}
const weekProjects = (entries, person, date) =>
  new Set(inRange(entries, 'weeks', person, mondayKey(date)).flatMap((e) => (e.projectId == null ? [] : [e.projectId])))
const duplicates = (list) => list.length - new Set(list.map((e) => e.projectId)).size

// --- store bridge ----------------------------------------------------------------------
function snapshot() {
  const s = demoStore.get()
  const entries = []
  PEOPLE.forEach((person) => {
    Object.entries(s.entries[person] || {}).forEach(([date, list]) => {
      list.forEach((e) => entries.push({ id: e.id, personId: person, projectId: e.project, date, hours: e.hours }))
    })
  })
  return { view: s.view, offset: s.offset, entries }
}

function visibleDates(state) {
  const monday = currentMonday()
  if (state.view === 'days') return daysOf('weeks', dateKey(addDays(monday, state.offset * 7)))
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, (state.offset - 2 + i) * 7)))
}

function applyOps(entries, ops, makeId) {
  let next = [...entries]
  for (const op of ops) {
    if (op.type === 'add') {
      const { personId, projectId, date, hours } = op
      next.push({ id: makeId(), personId, projectId, date, hours })
    } else if (op.type === 'update') {
      next = next.map((e) => (e.id === op.entryId ? { ...e, ...op.changes } : e))
    } else {
      next = next.filter((e) => e.id !== op.entryId)
    }
  }
  return next
}

function commit(ops) {
  const next = applyOps(snapshot().entries, ops, newEntryId)
  const entries = {}
  PEOPLE.forEach((p) => (entries[p] = {}))
  next.forEach((e) => {
    ;(entries[e.personId][e.date] ||= []).push({ id: e.id, project: e.projectId, hours: e.hours })
  })
  demoStore.set((s) => ({ ...s, entries }))
}

// --- planning (same rules as the original) ---------------------------------------------
let tmpId = 0
function validate(state, ops) {
  const cur = state.entries
  if (!ops.every((o) => o.type === 'add' || cur.some((e) => e.id === o.entryId))) return null
  const next = applyOps(cur, ops, () => `tmp${++tmpId}`)
  const curSet = new Set(cur)
  const nextSet = new Set(next)
  const added = next.filter((e) => !curSet.has(e))
  if (added.some((e) => isWeekendKey(e.date))) return null
  const touched = new Map([...cur.filter((e) => !nextSet.has(e)), ...added].map((e) => [entryCell(e), e]))
  const atMost = (n, old, lim) => n <= Math.max(lim, old)
  for (const { personId, date } of touched.values()) {
    const a = inRange(cur, 'days', personId, date)
    const o = inRange(next, 'days', personId, date)
    const sa = sumHours(a)
    const so = sumHours(o)
    const okSum = so === capacity(date) || so === sa || (isWeekendKey(date) && so < sa)
    if (
      !(
        okSum &&
        atMost(o.length, a.length, 2) &&
        duplicates(o) <= duplicates(a) &&
        atMost(weekProjects(next, personId, date).size, weekProjects(cur, personId, date).size, 2)
      )
    )
      return null
  }
  return [...touched.keys()]
}

const withCells = (state, action) => {
  const cells = validate(state, action.operations)
  return cells && { ...action, cellKeys: cells }
}

function pickProject(set, exclude) {
  const others = [...set].filter((p) => p !== exclude)
  const few = set.size < 2
  if (others.length > 0 && (!few || Math.random() < 0.6)) return pick(others)
  return few ? pick(PROJECTS.filter((p) => p !== exclude && !set.has(p))) : undefined
}

// "Refill": bring a day that is off capacity back to exactly 8h (0 on weekends).
function refill(state, days, busy, recent) {
  const candidates = PEOPLE.flatMap((personId) =>
    days.map((date) => ({ personId, date, entries: inRange(state.entries, 'days', personId, date) })),
  ).filter(
    ({ personId, date, entries }) =>
      sumHours(entries) !== capacity(date) &&
      !entries.some((e) => e.projectId === null) &&
      !(isWeekendKey(date) && entries.every((e) => recent.has(e.id))) &&
      !busy.has(cellKey(personId, date)),
  )
  const c = pick(candidates)
  if (!c) return null
  const wk = mondayKey(c.date)
  const group = state.view === 'weeks' ? candidates.filter((x) => x.personId === c.personId && mondayKey(x.date) === wk) : [c]
  const projects = weekProjects(state.entries, c.personId, c.date)
  const proj = pickProject(projects, null)
  const ops = group.flatMap(({ personId, date, entries }) => {
    const projectId = entries.some((e) => e.projectId === proj) ? pickProject(projects, proj ?? null) : proj
    const diff = capacity(date) - sumHours(entries)
    const free = entries.filter((e) => !recent.has(e.id))
    if (diff > 0) {
      const canAdd = projectId !== undefined && entries.length < 2
      const target = free[0] ?? (canAdd ? undefined : entries[entries.length - 1])
      if (target) return [{ type: 'update', entryId: target.id, changes: { hours: target.hours + diff } }]
      return canAdd ? [{ type: 'add', personId, date, projectId, hours: diff }] : []
    }
    const order = isWeekendKey(date) ? free : [...free, ...entries.filter((e) => recent.has(e.id))]
    const out = []
    let over = -diff
    for (const e of order) {
      if (over <= 0) break
      out.push(e.hours > over ? { type: 'update', entryId: e.id, changes: { hours: e.hours - over } } : { type: 'remove', entryId: e.id })
      over -= e.hours
    }
    return out
  })
  const [first] = ops
  if (!first) return null
  return withCells(state, {
    operations: ops,
    target:
      first.type === 'add'
        ? { kind: 'add', personId: first.personId, date: first.date }
        : { kind: first.type === 'update' ? 'hours' : 'remove', entryId: first.entryId },
  })
}

function pairsInCells(state, pool) {
  return [...new Map(pool.map((e) => [entryCell(e), e])).values()].flatMap((e) => {
    const list = inRange(state.entries, 'days', e.personId, e.date)
    return list.length === 2 ? [[list[0], list[1]]] : []
  })
}

const swap = (state, pool) => {
  const a = pick(pool)
  if (!a) return null
  const b = pick(
    pool.filter(
      (e) =>
        e.hours === a.hours &&
        e.projectId !== a.projectId &&
        entryCell(e) !== entryCell(a) &&
        (state.view === 'days' || e.personId !== a.personId || mondayKey(e.date) !== mondayKey(a.date)),
    ),
  )
  return b
    ? {
        operations: [
          { type: 'update', entryId: a.id, changes: { personId: b.personId, date: b.date } },
          { type: 'update', entryId: b.id, changes: { personId: a.personId, date: a.date } },
        ],
        target: { kind: 'entry', entryId: a.id },
        dropOnEntryId: b.id,
      }
    : null
}

const changeProject = (state, pool) => {
  const e = pick(pool)
  const p = e && pickProject(weekProjects(state.entries, e.personId, e.date), e.projectId)
  return e && p ? { operations: [{ type: 'update', entryId: e.id, changes: { projectId: p } }], target: { kind: 'name', entryId: e.id } } : null
}

const split = (state, pool) => {
  const e = pick(pool.filter((x) => x.hours >= 4 && inRange(state.entries, 'days', x.personId, x.date).length === 1))
  const p = e && pickProject(weekProjects(state.entries, e.personId, e.date), e.projectId)
  if (!e || !p) return null
  const h = Math.random() < 0.5 ? 2 : Math.floor(e.hours / 2)
  return {
    operations: [
      { type: 'update', entryId: e.id, changes: { hours: e.hours - h } },
      { type: 'add', personId: e.personId, date: e.date, projectId: p, hours: h },
    ],
    target: { kind: 'hours', entryId: e.id },
  }
}

const merge = (state, pool) => {
  const pair = pick(pairsInCells(state, pool))
  if (!pair) return null
  const [keep, drop] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
  return {
    operations: [
      { type: 'update', entryId: keep.id, changes: { hours: keep.hours + drop.hours } },
      { type: 'remove', entryId: drop.id },
    ],
    target: { kind: 'remove', entryId: drop.id },
  }
}

const move2h = (state, pool) => {
  const pair = pick(pairsInCells(state, pool).filter(([a, b]) => a.projectId !== b.projectId))
  if (!pair) return null
  const [from, to] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
  return from.hours < 4
    ? null
    : {
        operations: [
          { type: 'update', entryId: from.id, changes: { hours: from.hours - 2 } },
          { type: 'update', entryId: to.id, changes: { hours: to.hours + 2 } },
        ],
        target: { kind: 'hours', entryId: to.id },
      }
}

const ACTIONS = [
  [swap, 0.45],
  [changeProject, 0.2],
  [split, 0.15],
  [merge, 0.1],
  [move2h, 0.1],
]

function pickAction() {
  let r = Math.random()
  for (const [fn, w] of ACTIONS) {
    if (r < w) return fn
    r -= w
  }
  return swap
}

function planAction(state, busy, recent) {
  const dates = visibleDates(state)
  const days = state.view === 'days' ? dates : dates.flatMap((d) => daysOf('weeks', d))
  if (Math.random() < 0.8) {
    const r = refill(state, days, busy, recent)
    if (r) return r
  }
  const weekdays = new Set(days.filter((d) => !isWeekendKey(d)))
  const pool = state.entries.filter(
    (e) => e.projectId !== null && weekdays.has(e.date) && !recent.has(e.id) && !busy.has(entryCell(e)),
  )
  for (let i = 0; i < 30; i += 1) {
    const a = pickAction()(state, pool)
    const v = a && withCells(state, a)
    if (v) return v
  }
  return refill(state, days, busy, recent)
}

// --- engine state ----------------------------------------------------------------------
const frames = new Map() // frame element -> intersection ratio
const positions = new Map() // cursor id -> { x, y } in rem
const cursorEls = new Map() // cursor id -> Set<HTMLElement>
const recentUserMoves = new Map() // entry id -> timestamp of a user drop
const busyCells = new Set()
const listeners = new Set()
let cursors = null
let running = false
let session = 0
let lastInteraction = 0
let userDragging = false

const notify = () => listeners.forEach((l) => l())
const isAlive = (s) => running && s === session

function setCursor(id, patch) {
  if (!cursors) return
  cursors = cursors.map((c) => (c.id === id ? { ...c, ...patch } : c))
  notify()
  const carried = cursors.find((c) => c.carried)?.carried.entryId ?? null
  if (demoStore.get().carriedId !== carried) demoStore.set((s) => ({ ...s, carriedId: carried }))
}

const applyPos = (el, p) => {
  el.style.transform = `translate3d(${p.x}rem, ${p.y}rem, 0)`
}
function setPos(id, p) {
  positions.set(id, p)
  cursorEls.get(id)?.forEach((el) => applyPos(el, p))
}

export function bindBotCursor(id, el) {
  const set = cursorEls.get(id) ?? new Set()
  set.add(el)
  cursorEls.set(id, set)
  const p = positions.get(id)
  if (p) applyPos(el, p)
  return () => set.delete(el)
}

export function markUserMoved(ids) {
  const now = Date.now()
  ids.forEach((id) => recentUserMoves.set(id, now))
}
export function setUserDragging(v) {
  userDragging = v
}

function recentIds() {
  const now = Date.now()
  for (const [id, t] of recentUserMoves) if (now - t >= RECENT_USER_MOVE) recentUserMoves.delete(id)
  return new Set(recentUserMoves.keys())
}

function activeFrame() {
  let best = null
  let ratio = 0.3
  for (const [el, r] of frames) {
    if (r >= ratio) {
      best = el
      ratio = r
    }
  }
  return best
}

function userBusy() {
  if (Date.now() - lastInteraction < USER_PAUSE || userDragging) return true
  const active = document.activeElement
  return [...frames.keys()].some(
    (f) => (active instanceof HTMLInputElement && f.contains(active)) || f.querySelector('[role="listbox"]') !== null,
  )
}

// Convert a viewport rect point to frame-local rem (accounts for the mobile scale()).
function toFrame(frame, rect, fx, fy) {
  const fr = frame.getBoundingClientRect()
  const unit = parseFloat(getComputedStyle(document.documentElement).fontSize) * (fr.width / frame.offsetWidth)
  return { x: (rect.left + rect.width * fx - fr.left) / unit, y: (rect.top + rect.height * fy - fr.top) / unit }
}
const randomPoint = (frame) => toFrame(frame, frame.getBoundingClientRect(), rand(0.1, 0.9), rand(0.15, 0.8))

function inWorkArea(frame, rect) {
  const top = frame.querySelector('[data-demo-columns-header]')?.getBoundingClientRect().bottom
  const bottom = frame.querySelector('[data-demo-controls]')?.getBoundingClientRect().top
  return top !== undefined && bottom !== undefined && rect.width !== 0 && rect.top >= top - 1 && rect.bottom <= bottom + 1
}

const itemKey = (view, e) =>
  view === 'days' ? `entry-${e.id}` : `week-${e.personId}-${mondayKey(e.date)}-${e.projectId ?? 'empty'}`

function targetPoint(frame, target) {
  const { entries, view } = snapshot()
  let el
  if (target.kind === 'add') {
    el = frame.querySelector(`[data-demo-cell="${cellKey(target.personId, viewKey(view, target.date))}"] [data-demo-add]`)
  } else {
    const e = entries.find((x) => x.id === target.entryId)
    const item = e && frame.querySelector(`[data-demo-item="${itemKey(view, e)}"]`)
    el = target.kind === 'entry' ? item : item?.querySelector(`[data-demo-${target.kind}]`)
  }
  const r = el?.getBoundingClientRect()
  return r && inWorkArea(frame, r) ? toFrame(frame, r, target.kind === 'entry' ? 0.3 : 0.5, 0.5) : null
}

// One cubic Bezier segment with a random perpendicular bow, smootherstep easing.
function segment(id, to, duration, alive) {
  const from = positions.get(id)
  if (!from) return Promise.resolve()
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist < 0.5) return Promise.resolve()
  const n = { x: -dy / dist, y: dx / dist }
  const bow = rand(BOW.min, BOW.max) * dist * (Math.random() < 0.5 ? -1 : 1)
  const c1 = { x: from.x + 0.3 * dx + n.x * bow, y: from.y + 0.3 * dy + n.y * bow }
  const c2 = { x: from.x + 0.75 * dx + n.x * bow * 0.6, y: from.y + 0.75 * dy + n.y * bow * 0.6 }
  return new Promise((resolve) => {
    const start = performance.now()
    const step = (ts) => {
      if (!alive()) return resolve()
      const c = Math.min((ts - start) / duration, 1)
      const t = c * c * c * (10 - 15 * c + 6 * c * c)
      const u = 1 - t
      const a = u * u * u
      const b = 3 * u * u * t
      const d = 3 * u * t * t
      const e = t * t * t
      setPos(id, { x: a * from.x + b * c1.x + d * c2.x + e * to.x, y: a * from.y + b * c1.y + d * c2.y + e * to.y })
      if (c < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

async function travel(id, to, alive, slow = 1) {
  const from = positions.get(id)
  if (!from) return
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const duration = (200 + 120 * Math.log2(1 + dist / 14)) * rand(0.85, 1.15) * slow
  if (!(dist > 160 && Math.random() < 0.5)) return segment(id, to, duration, alive)
  const over = rand(OVERSHOOT.min, OVERSHOOT.max)
  const side = rand(-OVERSHOOT.min, OVERSHOOT.min)
  const u = { x: dx / dist, y: dy / dist }
  await segment(id, { x: to.x + u.x * over - u.y * side, y: to.y + u.y * over + u.x * side }, duration, alive)
  await segment(id, to, rand(SETTLE.min, SETTLE.max) * slow, alive)
}

async function idle(id, ms, alive) {
  const end = performance.now() + ms
  while (alive()) {
    const left = end - performance.now()
    if (left <= 0) return
    const p = positions.get(id)
    if (p && left > JITTER_MS.min && Math.random() < 0.6) {
      await segment(id, { x: p.x + rand(-JITTER.x, JITTER.x), y: p.y + rand(-JITTER.y, JITTER.y) }, Math.min(rand(JITTER_MS.min, JITTER_MS.max), left), alive)
    } else {
      await sleep(Math.min(left, rand(250, 600)))
    }
  }
}

async function perform(id, frame, plan, sess) {
  const alive = () => isAlive(sess)
  const { target, dropOnEntryId } = plan
  const from = targetPoint(frame, target)
  const to = dropOnEntryId === undefined ? null : targetPoint(frame, { kind: 'entry', entryId: dropOnEntryId })
  if (!from || (dropOnEntryId !== undefined && !to)) return false
  await travel(id, from, alive)
  if (!alive()) return false
  await sleepRange(PRE_PRESS)
  const carried = to && 'entryId' in target ? snapshot().entries.find((e) => e.id === target.entryId) : undefined
  setCursor(id, {
    pressed: true,
    carried: carried?.projectId ? { entryId: carried.id, project: carried.projectId, hours: carried.hours } : null,
  })
  await sleepRange(PRESS)
  if (to) {
    await travel(id, to, alive, DRAG_SLOWDOWN)
    await sleepRange(PRESS)
  } else {
    setCursor(id, { pressed: false })
    await sleepRange(POST_RELEASE)
  }
  return alive()
}

async function tryAction(id, frame, sess) {
  const plan = planAction(snapshot(), busyCells, recentIds())
  if (!plan) return false
  plan.cellKeys.forEach((k) => busyCells.add(k))
  try {
    if (!(await perform(id, frame, plan, sess)) || !isAlive(sess) || userBusy() || validate(snapshot(), plan.operations) === null)
      return false
    commit(plan.operations)
    return true
  } finally {
    plan.cellKeys.forEach((k) => busyCells.delete(k))
    setCursor(id, { pressed: false, carried: null })
  }
}

function wanderPoint(frame) {
  const rects = [...frame.querySelectorAll('[data-demo-item], [data-demo-cell]')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => inWorkArea(frame, r))
  const r = rects[Math.floor(Math.random() * rects.length)]
  return r && Math.random() < 0.7 ? toFrame(frame, r, rand(0.2, 0.8), rand(0.3, 0.8)) : randomPoint(frame)
}

async function runBot(id, sess, startDelay) {
  const alive = () => isAlive(sess)
  await idle(id, startDelay, alive)
  while (alive()) {
    await idle(id, rand(WAIT.min, WAIT.max), alive)
    const frame = activeFrame()
    if (frame && alive()) {
      const acted = !userBusy() && (await tryAction(id, frame, sess))
      if (!acted && alive()) await travel(id, wanderPoint(frame), alive)
    }
  }
}

function update() {
  const frame = activeFrame()
  if (frame && !running) {
    running = true
    session += 1
    cursors = BOTS.map((b) => ({ ...b, pressed: false, carried: null }))
    BOTS.forEach((b) => setPos(b.id, randomPoint(frame)))
    notify()
    BOTS.forEach((b, i) => runBot(b.id, session, (i + 1) * START_STAGGER))
  } else if (!frame && running) {
    running = false
    session += 1
    busyCells.clear()
    cursors = null
    positions.clear()
    notify()
    if (demoStore.get().carriedId !== null) demoStore.set((s) => ({ ...s, carriedId: null }))
  }
}

const EMPTY = []
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getCursors = () => cursors ?? EMPTY

export function useDemoBotCursors(frameRef) {
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      (entries) => {
        frames.set(el, entries[entries.length - 1].intersectionRatio)
        update()
      },
      { threshold: [0, 0.3, 0.6, 1] },
    )
    io.observe(el)
    const onUser = () => {
      lastInteraction = Date.now()
    }
    const events = ['pointerdown', 'keydown', 'dragstart']
    events.forEach((t) => el.addEventListener(t, onUser))
    return () => {
      io.disconnect()
      events.forEach((t) => el.removeEventListener(t, onUser))
      frames.delete(el)
      update()
    }
  }, [frameRef])
  return useSyncExternalStore(subscribe, getCursors)
}
