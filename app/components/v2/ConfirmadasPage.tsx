'use client'

import { useState, useMemo } from 'react'
import CalendarBoard from '@/app/components/CalendarBoard'
import ReservationActions from './ReservationActions'
import type { ReservationV2 } from '@/core/entities_v2'
import { formatDateKey } from '@/lib/calendar-utils'

interface ConfirmadasPageProps {
    canWrite: boolean
    records: ReservationV2[]
    loading: boolean
    onViewReservation: (r: ReservationV2) => void
    onEditReservation: (r: ReservationV2) => void
    onDeleteReservation: (r: ReservationV2) => void
    onCreateReservation: (date: string) => void
}

const UPCOMING_LIMIT = 15

function todayISO() {
    const d = new Date()
    return formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function monthOf(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatBR(iso: string) {
    const [y, m, day] = iso.split('-')
    return `${day}/${m}/${y}`
}

const BRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export function getUpcomingReservations(
    records: ReservationV2[],
    fromDate: string,
    limit: number
): ReservationV2[] {
    return records
        .filter((r) => r.checkIn >= fromDate)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .slice(0, limit)
}

export default function ConfirmadasPage({
    canWrite,
    records,
    loading,
    onViewReservation,
    onEditReservation,
    onDeleteReservation,
    onCreateReservation,
}: ConfirmadasPageProps) {
    const today = todayISO()
    const [month, setMonth] = useState(monthOf(new Date()))
    const [selectedDate, setSelectedDate] = useState(today)

    const upcoming = useMemo(
        () => getUpcomingReservations(records, today, UPCOMING_LIMIT),
        [records, today]
    )

    const selectedReservations = useMemo(
        () =>
            records.filter((r) => selectedDate >= r.checkIn && selectedDate < r.checkOut),
        [records, selectedDate]
    )

    function handleMonthChange(newMonth: string) {
        setMonth(newMonth)
    }

    function handleDateClick(date: string) {
        setSelectedDate(date)
    }

    function handleDateLongPress(date: string) {
        if (!canWrite) return
        onCreateReservation(date)
    }

    return (
        <div className="pb-20">
            {/* Desktop: 2-column layout */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                {/* Left: Calendar + Selected */}
                <div className="lg:col-span-7">
                    {/* Calendar Section */}
                    <section className="card mb-4">
                        <CalendarBoard
                            month={month}
                            items={records}
                            selectedDate={selectedDate}
                            onMonthChange={handleMonthChange}
                            onSelectDate={handleDateClick}
                        />
                    </section>

                    {/* Selected Date Reservations */}
                    {selectedReservations.length > 0 && (
                        <section className="card mb-4">
                            <h2 className="text-sm font-semibold text-token-muted mb-2">
                                Reservas em {formatBR(selectedDate)}
                            </h2>
                            <div className="space-y-2">
                                {selectedReservations.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-token-surface-alt"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-token truncate">
                                                {r.guestName}{' '}
                                                <span className="text-token-muted">({r.partySize})</span>
                                            </div>
                                            <div className="text-xs text-token-muted">
                                                {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                            </div>
                                        </div>
                                        <ReservationActions
                                            onView={() => onViewReservation(r)}
                                            onEdit={canWrite ? () => onEditReservation(r) : undefined}
                                            onDelete={canWrite ? () => onDeleteReservation(r) : undefined}
                                            variant="compact"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right: Upcoming (visible on desktop, scrolls on mobile) */}
                <div className="lg:col-span-5">
                    <section className="card">
                        <h2 className="text-lg font-semibold mb-3">Próximas Reservas</h2>

                        {loading ? (
                            <div className="text-sm text-token-muted">Carregando...</div>
                        ) : upcoming.length === 0 ? (
                            <p className="text-sm text-token-muted">Nenhuma reserva futura.</p>
                        ) : (
                            <div className="space-y-2">
                                {upcoming.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-token-surface-alt"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-token truncate">
                                                    {r.guestName}
                                                </span>
                                                <span className="text-xs text-token-muted">
                                                    ({r.partySize})
                                                </span>
                                                {(r.rooms ?? 1) > 1 && (
                                                    <span className="text-xs bg-blue-100  text-blue-700  px-1.5 py-0.5 rounded">
                                                        {r.rooms}q
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-token-muted">
                                                {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                            </div>
                                            <div className="text-xs font-medium text-token-success">
                                                {BRL(r.totalPrice)}
                                            </div>
                                        </div>

                                        <ReservationActions
                                            onView={() => onViewReservation(r)}
                                            onEdit={canWrite ? () => onEditReservation(r) : undefined}
                                            onDelete={canWrite ? () => onDeleteReservation(r) : undefined}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}
