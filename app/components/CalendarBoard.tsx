'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

type Item = { checkIn: string }

export default function CalendarBoard({
  month,                // "YYYY-MM"
  onMonthChange,
  selectedDate,         // "YYYY-MM-DD"
  onSelectDate,
  items,
  roomsTotal = 3,
}: {
  month: string
  onMonthChange: (m: string) => void
  selectedDate: string
  onSelectDate: (iso: string) => void
  items: Item[]
  roomsTotal?: number
}) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const startDow = (first.getDay() + 6) % 7 // Monday=0
  const daysInMonth = new Date(y, m, 0).getDate()

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

  // ----- occupancy
  const counts: Record<string, number> = {}
  for (const it of items) counts[it.checkIn] = (counts[it.checkIn] || 0) + 1

  const keyFor = (day: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Softer, clearer palette:
  // 1 = pastel yellow, 2 = softened orange, 3+ = dark red
  const tint = (c: number) =>
    c >= roomsTotal ? 'bg-red-200'
      : c === 2 ? 'bg-orange-100'
      : c === 1 ? 'bg-yellow-100' : ''

  const dot = (c: number) =>
    c >= roomsTotal ? 'bg-red-700'
      : c === 2 ? 'bg-orange-500'
      : c === 1 ? 'bg-yellow-500' : 'bg-transparent'

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

  // ----- grid
  const grid: (number | null)[] = Array(startDow).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (grid.length % 7) grid.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-700">Calendário</div>
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
        <div className="font-semibold">
          {new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
        <button className="btn-ghost p-1" onClick={nextMonth} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, idx) => {
          if (day === null) return <div key={idx} />
          const key = keyFor(day)
          const count = counts[key] || 0
          const isSelected = selectedDate === key
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(key)}
              title={count ? `${count}/${roomsTotal} reservas` : 'Sem reservas'}
              className={[
                'relative h-11 w-full rounded-xl text-sm text-gray-900',
                'bg-white', // force light base
                tint(count),
                isSelected ? 'ring-2 ring-blue-600' : 'ring-1 ring-gray-200',
                'transition transform-gpu hover:-translate-y-0.5 hover:shadow-sm',
              ].join(' ')}
            >
              {day}
              <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${dot(count)}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}