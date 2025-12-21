'use client'

import { useState, useMemo } from 'react'
import { Eye, Settings, Trash2, Plus } from 'lucide-react'
import CalendarBoard from '@/app/components/CalendarBoard'
import type { ReservationV2 } from '@/core/entities_v2'
import { formatDateKey } from '@/lib/calendar-utils'

interface ConfirmadasPageProps {
    canWrite: boolean
    records: ReservationV2[]  // Passed from parent
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

/**
 * Gets upcoming confirmed reservations from today onwards, sorted by checkIn.
 */
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
    records,        // No longer fetching internally!
    loading,
    onViewReservation,
    onEditReservation,
    onDeleteReservation,
    onCreateReservation,
}: ConfirmadasPageProps) {
    const today = todayISO()
    const [month, setMonth] = useState(monthOf(new Date()))
    const [selectedDate, setSelectedDate] = useState(today)

    // Derive upcoming and selected from props (no fetch!)
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
        // No refetch! Just UI state change.
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
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">
                        Reservas em {formatBR(selectedDate)}
                    </h2>
                    <div className="space-y-2">
                        {selectedReservations.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                        {r.guestName}{' '}
                                        <span className="text-gray-500">({r.partySize})</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onViewReservation(r)}
                                        className="btn-icon"
                                        title="Ver detalhes"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {canWrite && (
                                        <>
                                            <button
                                                onClick={() => onEditReservation(r)}
                                                className="btn-icon"
                                                title="Editar"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteReservation(r)}
                                                className="btn-icon text-red-500"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Reservations */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-3">Próximas Reservas</h2>

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : upcoming.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma reserva futura.</p>
                ) : (
                    <div className="space-y-2">
                        {upcoming.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {r.guestName}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            ({r.partySize} pessoas)
                                        </span>
                                        {(r.rooms ?? 1) > 1 && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                {r.rooms} quartos
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                    </div>
                                    <div className="text-xs font-medium text-green-600">
                                        {BRL(r.totalPrice)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onViewReservation(r)}
                                        className="btn-icon"
                                        title="Ver detalhes"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {canWrite && (
                                        <>
                                            <button
                                                onClick={() => onEditReservation(r)}
                                                className="btn-icon"
                                                title="Editar"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteReservation(r)}
                                                className="btn-icon text-red-500"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
