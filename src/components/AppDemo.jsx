import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { demo } from '../content.js'
import { demoStore, useStore } from '../lib/store.js'
import { addDays, currentMonday, dateKey, fmtDay, fmtRange, isWeekend } from '../lib/dates.js'
import { newEntryId } from '../lib/demoData.js'
import { bindBotCursor, markUserMoved, setUserDragging, useDemoBotCursors } from '../lib/motion.js'
import useIsDesktop from '../lib/useIsDesktop.js'
import { BotArrow, ChevronLeft, ChevronRight, CloseIcon, PlusIcon } from './Icons.jsx'

// Interactive demo calendar (spec 5). Data, view and period are shared between loop copies
// through demoStore.

const projectName = (id) => demo.projects.find((p) => p.id === id)?.name

function updateCell(person, key, fn) {
  demoStore.set((s) => {
    const personEntries = s.entries[person] || {}
    return {
      ...s,
      entries: { ...s.entries, [person]: { ...personEntries, [key]: fn(personEntries[key] || []) } },
    }
  })
}

function moveEntry(from, to) {
  if (from.person === to.person && from.key === to.key) return
  demoStore.set((s) => {
    const src = s.entries[from.person]?.[from.key] || []
    const entry = src.find((e) => e.id === from.id)
    if (!entry) return s
    const entries = { ...s.entries }
    entries[from.person] = { ...entries[from.person], [from.key]: src.filter((e) => e.id !== from.id) }
    const dst = entries[to.person]?.[to.key] || []
    entries[to.person] = { ...entries[to.person], [to.key]: [...dst, entry] }
    return { ...s, entries }
  })
  // Bots leave user-dropped entries alone for 20s (as on the original).
  markUserMoved([from.id])
}

// Columns + period for the current view (spec 5.3).
function buildColumns(view, offset) {
  const monday = currentMonday()
  const todayKey = dateKey(new Date())
  if (view === 'days') {
    const start = addDays(monday, offset * 7)
    const cols = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i)
      return {
        key: dateKey(d),
        label: fmtDay(d),
        dates: [d],
        current: dateKey(d) === todayKey,
        capacity: isWeekend(d) ? 0 : demo.dayCapacity,
      }
    })
    return { cols, period: fmtRange(start, addDays(start, 6)) }
  }
  const cols = Array.from({ length: 7 }, (_, i) => {
    const w = offset - 2 + i
    const ws = addDays(monday, w * 7)
    return {
      key: `w${dateKey(ws)}`,
      label: fmtRange(ws, addDays(ws, 6)),
      dates: Array.from({ length: 7 }, (_, j) => addDays(ws, j)),
      current: w === 0,
      capacity: demo.weekCapacity,
    }
  })
  const first = addDays(monday, (offset - 2) * 7)
  const last = addDays(monday, (offset + 4) * 7 + 6)
  return { cols, period: fmtRange(first, last) }
}

// Weeks view aggregates per project per week (read-only chips).
function cellItems(view, personEntries, col) {
  if (view === 'days') return personEntries[col.key] || []
  const byProject = new Map()
  col.dates.forEach((d) => {
    ;(personEntries[dateKey(d)] || []).forEach((e) => {
      byProject.set(e.project, (byProject.get(e.project) || 0) + e.hours)
    })
  })
  return [...byProject].map(([project, hours]) => ({ id: `agg-${col.key}-${project}`, project, hours }))
}

const summaryColor = (sum, cap) => {
  const diff = sum - cap
  if (diff >= 2) return 'text-red-500'
  if (diff >= 1) return 'text-orange-500'
  return 'text-sand-500'
}

// ---------------------------------------------------------------------------

function ProjectSelect({ value, anchorRef, frameRef, onSelect, onClose }) {
  const listRef = useRef(null)
  const [opensUp, setOpensUp] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    const controls = frameRef.current?.querySelector('[data-demo-controls]')
    if (!list || !controls) return
    const lr = list.getBoundingClientRect()
    const pill = controls.firstElementChild?.getBoundingClientRect()
    if (pill && lr.bottom > pill.top) setOpensUp(true)
  }, [frameRef])

  useEffect(() => {
    const onDown = (e) => {
      if (listRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return
      onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose])

  return (
    <div
      ref={listRef}
      role="listbox"
      className={`absolute left-[-8rem] w-[calc(100%+44rem)] z-20 flex flex-col overflow-hidden bg-gray-700 rounded-[5rem] shadow-[0_4rem_20rem_rgba(0,0,0,.12)] ${opensUp ? 'bottom-[calc(100%+12rem)]' : 'top-[calc(100%+12rem)]'}`}
    >
      {demo.projects.map((p) => (
        <button
          key={p.id}
          type="button"
          role="option"
          aria-selected={p.id === value}
          onClick={() => onSelect(p.id)}
          className="d-sm p-[7rem] border-0 border-b border-solid border-gray-600 last:border-b-0 bg-transparent text-sand-100 text-left cursor-pointer [transition:background-color_.3s_ease] hover:bg-gray-600 focus-visible:bg-gray-600 focus-visible:outline-none aria-selected:text-sand-500"
        >
          {p.name}
        </button>
      ))}
    </div>
  )
}

function HoursInput({ hours, readOnly, onChange }) {
  const text = String(hours)
  return (
    <input
      type="text"
      data-demo-hours
      inputMode="numeric"
      value={text}
      disabled={readOnly}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(-2)
        onChange(parseInt(digits || '0', 10))
      }}
      style={{ width: `calc(${text.length}ch + 4rem)` }}
      className={`d-n min-w-[16rem] px-[2rem] border-0 rounded-[5rem] bg-transparent text-center cursor-text [transition:background-color_.3s_ease] hover:enabled:bg-sand-200 focus:bg-sand-200 focus:outline-none disabled:cursor-default disabled:opacity-100 disabled:[-webkit-text-fill-color:#b8b2a6] ${hours === 0 ? 'text-sand-500' : 'text-gray-600'}`}
    />
  )
}

function Entry({ entry, itemKey, readOnly, carried, frameRef, onHours, onProject, onRemove, onDragStart, onDragEnd }) {
  const [open, setOpen] = useState(false)
  const [dragOk, setDragOk] = useState(true)
  const nameRef = useRef(null)
  const name = projectName(entry.project)
  const draggable = !readOnly

  return (
    <div
      data-demo-item={itemKey}
      draggable={draggable && dragOk}
      onPointerDown={(e) => setDragOk(e.target.tagName !== 'INPUT')}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`demo-entry relative w-full flex items-start justify-between gap-[4rem] p-[8rem] bg-sand-100 border border-solid border-transparent rounded-[5rem] [transition:border-color_.5s_ease] ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${carried ? 'opacity-40' : ''}`}
    >
      <div className="relative flex-1 min-w-0">
        <button
          ref={nameRef}
          type="button"
          data-demo-name
          disabled={readOnly}
          onClick={() => setOpen((o) => !o)}
          className={`d-n block w-full min-h-[16rem] px-[3rem] ml-[-3rem] border-0 rounded-[5rem] bg-transparent text-gray-600 text-left whitespace-nowrap overflow-hidden text-ellipsis [transition:background-color_.3s_ease] enabled:hover:bg-sand-200 focus-visible:bg-sand-200 focus-visible:outline-none ${draggable ? 'cursor-[inherit]' : 'cursor-default'}`}
        >
          {name ? name : <span className="text-sand-500">{demo.empty}</span>}
        </button>
        {open && (
          <ProjectSelect
            value={entry.project}
            anchorRef={nameRef}
            frameRef={frameRef}
            onSelect={(p) => {
              onProject(p)
              setOpen(false)
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
      <div className="relative flex items-start shrink-0">
        <HoursInput hours={entry.hours} readOnly={readOnly} onChange={onHours} />
        {!readOnly && (
          <button
            type="button"
            aria-label={demo.removeAria}
            data-demo-remove
            onClick={onRemove}
            className="flex pt-[1rem] px-0 pb-0 border-0 bg-transparent text-sand-600 cursor-pointer hover:text-gray-700 focus-visible:text-gray-700 focus-visible:outline-none"
          >
            <CloseIcon className="w-[14rem] h-[14rem]" />
          </button>
        )}
      </div>
    </div>
  )
}

function Cell({ person, view, col, items, readOnly, carriedId, frameRef, drag }) {
  const sum = items.reduce((a, e) => a + e.hours, 0)
  const isDropTarget = drag.target?.person === person && drag.target?.key === col.key

  const dropHandlers = readOnly
    ? {}
    : {
        onDragOver: (e) => {
          if (!drag.source.current) return
          e.preventDefault()
          if (!isDropTarget) drag.setTarget({ person, key: col.key })
        },
        onDrop: (e) => {
          e.preventDefault()
          if (drag.source.current) moveEntry(drag.source.current, { person, key: col.key })
          setUserDragging(false)
          drag.source.current = null
          drag.setTarget(null)
        },
      }

  const weekStart = view === 'weeks' ? dateKey(col.dates[0]) : null
  return (
    <div className="min-w-0" {...dropHandlers}>
      <div data-demo-cell={`${person}|${weekStart ?? col.key}`} className="w-full p-[7rem] flex flex-col items-center gap-[5rem] bg-sand-200 rounded-[10rem]">
        {items.map((entry) => (
          <Entry
            key={entry.id}
            entry={entry}
            itemKey={weekStart ? `week-${person}-${weekStart}-${entry.project ?? 'empty'}` : `entry-${entry.id}`}
            readOnly={readOnly}
            carried={entry.id === carriedId}
            frameRef={frameRef}
            onHours={(h) => updateCell(person, col.key, (list) => list.map((e) => (e.id === entry.id ? { ...e, hours: h } : e)))}
            onProject={(p) => updateCell(person, col.key, (list) => list.map((e) => (e.id === entry.id ? { ...e, project: p } : e)))}
            onRemove={() => updateCell(person, col.key, (list) => list.filter((e) => e.id !== entry.id))}
            onDragStart={(e) => {
              drag.source.current = { person, key: col.key, id: entry.id }
              setUserDragging(true)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', entry.id)
            }}
            onDragEnd={() => {
              setUserDragging(false)
              drag.source.current = null
              drag.setTarget(null)
            }}
          />
        ))}
        {isDropTarget && <div className="w-full h-[2rem] bg-sand-400 rounded-[5rem]" />}
        {!readOnly && (
          <button
            type="button"
            aria-label={demo.addAria}
            onClick={() => updateCell(person, col.key, (list) => [...list, { id: newEntryId(), project: null, hours: 0 }])}
            className="group w-full h-[14rem] flex items-center justify-center border-0 bg-transparent p-0 text-gray-700 cursor-pointer focus-visible:outline-none"
          >
            <span className="w-[14rem] h-[14rem] flex items-center justify-center rounded-[100rem] [transition:background-color_.3s_ease,transform_.3s_ease] group-hover:bg-sand-100 group-hover:rotate-90 group-focus-visible:bg-sand-100 group-focus-visible:rotate-90">
              <PlusIcon className="w-[12rem] h-[12rem]" />
            </span>
          </button>
        )}
      </div>
      <div className="min-h-[13.5rem] mt-[7rem] whitespace-nowrap">
        {sum > 0 && <span className={`d-sm ${summaryColor(sum, col.capacity)}`}>{demo.summary(sum)}</span>}
      </div>
    </div>
  )
}

function PersonRow({ person, view, cols, personEntries, carriedId, frameRef, drag }) {
  const readOnly = view === 'weeks'
  const cells = cols.map((col) => ({ col, items: cellItems(view, personEntries, col) }))
  const total = cells.reduce((a, c) => a + c.items.reduce((b, e) => b + e.hours, 0), 0)
  const cap = cols.reduce((a, c) => a + c.capacity, 0)
  return (
    <div className="pt-0 px-[10rem] pb-[15rem]">
      <div className="flex items-baseline gap-[6rem] pb-[10rem]">
        <span className="d-n min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
          {person.name} ({person.role})
        </span>
        <span className={`d-sm ${total > cap ? 'text-red-500' : 'text-sand-500'}`}>{demo.total(total, cap)}</span>
      </div>
      <div className="grid grid-cols-7 gap-[7rem] items-start">
        {cells.map(({ col, items }) => (
          <Cell
            key={col.key}
            person={person.id}
            view={view}
            col={col}
            items={items}
            readOnly={readOnly}
            carriedId={carriedId}
            frameRef={frameRef}
            drag={drag}
          />
        ))}
      </div>
    </div>
  )
}

function Controls({ view, period }) {
  const step = view === 'days' ? 1 : 7
  const shift = (dir) => demoStore.set((s) => ({ ...s, offset: s.offset + dir * step }))
  const setView = (v) => demoStore.set((s) => ({ ...s, view: v }))
  const pill = 'h-[30rem] flex items-center overflow-hidden rounded-[100rem] bg-gray-700 text-sand-100 pointer-events-auto'
  const arrow =
    'w-[22rem] h-[22rem] flex items-center justify-center p-0 border-0 rounded-[999rem] bg-transparent text-inherit cursor-pointer [transition:background-color_.2s_ease] hover:bg-gray-600 focus-visible:bg-gray-600 focus-visible:outline-none'
  return (
    <div data-demo-controls className="absolute left-0 right-0 bottom-[20rem] z-[60] flex justify-center gap-[5rem] pointer-events-none">
      <div className={`${pill} w-[190rem] justify-between gap-[5rem] px-[4rem]`}>
        <button type="button" aria-label={demo.prevAria} className={arrow} onClick={() => shift(-1)}>
          <ChevronLeft className="w-[12rem] h-[12rem]" />
        </button>
        <span className="d-n flex-1 text-center whitespace-nowrap">{period}</span>
        <button type="button" aria-label={demo.nextAria} className={arrow} onClick={() => shift(1)}>
          <ChevronRight className="w-[12rem] h-[12rem]" />
        </button>
      </div>
      <div className={pill}>
        {[
          ['days', demo.days],
          ['weeks', demo.weeks],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`d-n w-[60rem] h-full p-0 border-0 rounded-[999rem] text-inherit cursor-pointer [transition:background-color_.2s_ease] focus-visible:outline-none ${view === v ? 'bg-demo-active hover:bg-demo-active' : 'bg-transparent hover:bg-gray-600 focus-visible:bg-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Bot cursor layer (spec 5.5). Positions are written straight to the element by the bot
// engine every frame (bindBotCursor), so React only re-renders on press/carry changes.
function BotCursor({ c }) {
  const ref = useRef(null)
  useLayoutEffect(() => (ref.current ? bindBotCursor(c.id, ref.current) : undefined), [c.id])
  return (
        <div
          ref={ref}
          className="absolute top-0 left-0 text-gray-700 will-change-transform animate-appear"
        >
          <BotArrow
            className={`relative z-[2] block w-[12rem] h-[12rem] mt-[-1.5rem] ml-[-1.5rem] origin-[1.5rem_1.5rem] [transition:transform_.12s_ease] ${c.pressed ? '[transform:scale(.8)]' : ''}`}
          />
          <span className="d-sm absolute top-[10rem] left-[9rem] z-[2] py-[1rem] px-[6rem] rounded-[999rem] bg-gray-700 text-sand-100 whitespace-nowrap">
            {c.name}
          </span>
          {c.carried && (
            <div className="absolute top-[6rem] left-[6rem] z-[1] w-[112rem] flex justify-between gap-[4rem] p-[8rem] bg-sand-100 border border-solid border-sand-400 rounded-[5rem] text-gray-600 shadow-[0_6rem_16rem_rgba(0,0,0,.08)] [transform:rotate(-2deg)]">
              <span className="d-n min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{projectName(c.carried.project)}</span>
              <span className="d-n">{c.carried.hours}</span>
            </div>
          )}
        </div>
  )
}

function BotCursorsLayer({ cursors }) {
  return (
    <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden rounded-[inherit]">
      {cursors.map((c) => (
        <BotCursor key={c.id} c={c} />
      ))}
    </div>
  )
}

export default function AppDemo() {
  const { view, offset, entries, carriedId } = useStore(demoStore)
  const isDesktop = useIsDesktop()
  const outerRef = useRef(null)
  const frameRef = useRef(null)
  const scrollRef = useRef(null)
  const dragSource = useRef(null)
  const [dropTarget, setDropTarget] = useState(null)
  const drag = { source: dragSource, target: dropTarget, setTarget: setDropTarget }

  // Bot cursors (src/lib/botCursors.js): start at >= 30% visibility.
  const cursors = useDemoBotCursors(frameRef)

  const { cols, period } = buildColumns(view, offset)

  // Mobile: frame stays 1039rem wide and is scaled to the outer box (spec 5.1).
  useLayoutEffect(() => {
    const outer = outerRef.current
    const frame = frameRef.current
    if (!outer || !frame) return
    if (isDesktop) {
      frame.style.transform = ''
      frame.style.visibility = ''
      return
    }
    const apply = () => {
      frame.style.transform = `scale(${outer.clientWidth / frame.offsetWidth})`
      frame.style.visibility = 'visible'
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(outer)
    return () => ro.disconnect()
  }, [isDesktop])

  // Keep inner wheel scrolling from reaching the page loop scroller unless at an edge.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e) => {
      const up = e.deltaY < 0
      const atTop = el.scrollTop <= 0
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      if ((up && !atTop) || (!up && !atBottom)) e.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <section id="demo-section" aria-label={demo.ariaLabel} className="pt-pad-section px-pad-section mob:pt-[60rem] mob:pb-[30rem] mob:px-0">
      <div ref={outerRef} className="mob:w-[calc(100vw-40rem)] mob:ml-[calc(50%-50vw+20rem)] mob:aspect-[1039/630] mob:overflow-hidden">
        <div
          ref={frameRef}
          className="relative w-full h-[630rem] overflow-hidden bg-sand-100 rounded-landing text-gray-600 text-left select-none [&_input]:select-text mob:w-[1039rem] mob:origin-top-left mob:invisible mob:pointer-events-none"
        >
          <div className="relative h-full">
            <div ref={scrollRef} className="h-full overflow-y-auto pt-0 px-[25rem] pb-[45rem] no-scrollbar">
              <div data-demo-columns-header className="sticky top-0 z-50 grid grid-cols-7 gap-[7rem] mt-0 mx-[-25rem] mb-[15rem] pt-[25rem] px-[35rem] pb-0 bg-sand-100">
                {cols.map((c) => (
                  <div
                    key={c.key}
                    className={`min-w-0 flex justify-center py-[8rem] border-0 border-b [border-style:none_none_solid] whitespace-nowrap ${c.current ? '[border-color:currentColor_currentColor_theme(colors.gray.700)]' : '[border-color:currentColor_currentColor_theme(colors.sand.400)]'}`}
                  >
                    <span className={view === 'days' ? 'd-md' : 'd-n'}>{c.label}</span>
                  </div>
                ))}
              </div>
              {demo.people.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  view={view}
                  cols={cols}
                  personEntries={entries[p.id] || {}}
                  carriedId={carriedId}
                  frameRef={frameRef}
                  drag={drag}
                />
              ))}
            </div>
            <Controls view={view} period={period} />
          </div>
          <BotCursorsLayer cursors={cursors} />
        </div>
      </div>
    </section>
  )
}
