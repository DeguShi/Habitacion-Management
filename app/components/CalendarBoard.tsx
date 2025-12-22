'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import { WEEKDAY_LABELS, generateMonthGrid, formatDateKey, getBookedRoomsByDay, MAX_ROOMS } from '@/lib/calendar-utils'

interface OccupancyItem {
  checkIn: string
  checkOut: string
  status?: string // optional for backward compatibility
  rooms?: number
}

export default function CalendarBoard({
  month,                // "YYYY-MM"
  onMonthChange,
  selectedDate,         // "YYYY-MM-DD"
  onSelectDate,
  items,
  roomsTotal = MAX_ROOMS,
}: {
  month: string
  onMonthChange: (m: string) => void
  selectedDate: string
  onSelectDate: (iso: string) => void
  items: OccupancyItem[]
  roomsTotal?: number
}) {
  const [y, m] = month.split('-').map(Number)

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setDraft(toDraft(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`))
  }
  const nextMonth = () => {
    const d = new Date(y, m, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setDraft(toDraft(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`))
  }

  // ----- occupancy (rooms-based, multi-night aware)
  const bookedRooms = useMemo(() =>
    getBookedRoomsByDay(items, month, roomsTotal),
    [items, month, roomsTotal]
  )

  const keyFor = (day: number) => formatDateKey(y, m, day)

  // Occupancy-based palette: intensity by rooms ratio (with dark mode variants)
  const tint = (rooms: number) =>
    rooms >= roomsTotal ? '!bg-red-200 dark:!bg-red-900/50'
      : rooms >= 2 ? '!bg-orange-100 dark:!bg-orange-900/40'
        : rooms >= 1 ? '!bg-yellow-100 dark:!bg-yellow-900/40'
          : 'bg-surface'

  const dot = (rooms: number) =>
    rooms >= roomsTotal ? 'bg-red-700 dark:bg-red-400'
      : rooms >= 2 ? 'bg-orange-500 dark:bg-orange-400'
        : rooms >= 1 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-transparent'

  // ----- free-text month input (dd-mm-yyyy) with parse on blur/Enter
  const [draft, setDraft] = useState<string>(toDraft(month))
  function toDraft(ym: string) {
    const [yy, mm] = ym.split('-')
    return `01-${mm}-${yy}` // show day for clarity; user can edit freely
  }
  function parseDraft(str: string): string | null {
    const s = str.trim().replace(/\//g, '-')
    // dd-mm-yyyy
    const m1 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s)
    if (m1) {
      const dd = Number(m1[1]), mm = Number(m1[2]), yy = Number(m1[3])
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${yy}-${String(mm).padStart(2, '0')}`
      }
      return null
    }
    // mm-yyyy
    const m2 = /^(\d{1,2})-(\d{4})$/.exec(s)
    if (m2) {
      const mm = Number(m2[1]), yy = Number(m2[2])
      if (mm >= 1 && mm <= 12) return `${yy}-${String(mm).padStart(2, '0')}`
      return null
    }
    // yyyy-mm
    const m3 = /^(\d{4})-(\d{1,2})$/.exec(s)
    if (m3) {
      const yy = Number(m3[1]), mm = Number(m3[2])
      if (mm >= 1 && mm <= 12) return `${yy}-${String(mm).padStart(2, '0')}`
      return null
    }
    return null
  }
  function commitDraft() {
    const parsed = parseDraft(draft)
    if (parsed) onMonthChange(parsed)
    else setDraft(toDraft(month)) // reset if invalid
  }

  // ----- grid (using centralized utility)
  const grid = generateMonthGrid(y, m)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted">Calendário</div>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
          placeholder="dd-mm-aaaa"
          className="btn-ghost px-2 py-1"
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <button className="btn-ghost p-1" onClick={prevMonth} aria-label="Mês anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="font-semibold text-app">
          {new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
        <button className="btn-ghost p-1" onClick={nextMonth} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers - Monday first (using centralized labels) */}
      <div className="grid grid-cols-7 text-center text-xs text-muted mb-1">
        {WEEKDAY_LABELS.map(label => <div key={label}>{label}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, idx) => {
          if (day === null) return <div key={idx} />
          const key = keyFor(day)
          const rooms = bookedRooms.get(key) || 0
          const isSelected = selectedDate === key
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(key)}
              title={rooms ? `${rooms}/${roomsTotal} quartos` : 'Livre'}
              className={[
                'relative h-11 w-full rounded-xl text-sm',
                'text-app',
                'bg-surface',
                tint(rooms),
                isSelected ? 'ring-2 ring-primary' : 'ring-1 ring-app border-app',
                'transition transform-gpu hover:-translate-y-0.5 hover:shadow-sm',
              ].join(' ')}
            >
              {day}
              <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${dot(rooms)}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}