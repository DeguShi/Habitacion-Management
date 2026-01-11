'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import CalendarBoard from '@/app/components/CalendarBoard'
import ReservationActions from './ReservationActions'
import { RoomsChip } from '@/app/components/ui/Chip'
import PageHeader from '@/app/components/ui/PageHeader'
import type { ReservationV2 } from '@/core/entities_v2'
import { formatDateKey, MAX_ROOMS } from '@/lib/calendar-utils'

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

    // Calculate rooms used on selected date (for showing create button)
    const selectedRoomsUsed = useMemo(() => {
        return selectedReservations.reduce((sum, r) => sum + (r.rooms ?? 1), 0)
    }, [selectedReservations])

    // Can create on selected date: is today or future, has room capacity, and canWrite
    const canCreateOnSelectedDate = canWrite && selectedDate >= today && selectedRoomsUsed < MAX_ROOMS

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

                    {/* Selected Date Card - Always visible */}
                    <section className="card mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-token-muted">
                                {formatBR(selectedDate)}
                            </h2>
                            {selectedReservations.length > 0 && (
                                <span className="text-xs text-token-muted">
                                    {selectedRoomsUsed}/{MAX_ROOMS} quartos
                                </span>
                            )}
                        </div>

                        {selectedReservations.length > 0 ? (
                            <div className="space-y-2">
                                {selectedReservations.map((r) => (
                                    <div
                                        key={r.id}
                                        className="mini-card flex items-center justify-between"
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
                        ) : (
                            <p className="text-sm text-token-muted mb-3">
                                Nenhuma reserva para esta data
                            </p>
                        )}

                        {/* Create button - only for today or future, with room capacity */}
                        {canCreateOnSelectedDate && (
                            <button
                                onClick={() => onCreateReservation(selectedDate)}
                                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--eco-primary)] text-white font-medium hover:opacity-90 transition"
                            >
                                <Plus size={18} />
                                {selectedReservations.length > 0 ? 'Adicionar Reserva' : 'Criar Reserva'}
                            </button>
                        )}

                        {/* Past date message */}
                        {selectedDate < today && (
                            <p className="text-xs text-token-muted mt-2 text-center">
                                Data passada — não é possível criar reservas
                            </p>
                        )}
                    </section>
                </div>

                {/* Right: Upcoming (visible on desktop, scrolls on mobile) */}
                <div className="lg:col-span-5">
                    <section className="card sticky top-20">
                        <PageHeader title="Próximas Reservas" subtitle={`${upcoming.length} próximas`} />

                        {loading ? (
                            <div className="text-sm eco-muted">Carregando...</div>
                        ) : upcoming.length === 0 ? (
                            <p className="text-sm eco-muted">Nenhuma reserva futura.</p>
                        ) : (
                            <div className="space-y-2">
                                {upcoming.map((r) => (
                                    <div
                                        key={r.id}
                                        className="mini-card flex items-center justify-between"
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
                                                    <RoomsChip rooms={r.rooms ?? 1} />
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
