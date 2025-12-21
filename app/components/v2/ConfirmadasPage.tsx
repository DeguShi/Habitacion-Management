'use client'

import { useState, useEffect, useMemo } from 'react'
import { Eye, Settings, Trash2, Plus } from 'lucide-react'
import CalendarBoard from '@/app/components/CalendarBoard'
import type { ReservationV2 } from '@/core/entities_v2'
import { listV2Records } from '@/lib/data/v2'
import { formatDateKey } from '@/lib/calendar-utils'

interface ConfirmadasPageProps {
    canWrite: boolean
    onViewReservation: (r: ReservationV2) => void
    onEditReservation: (r: ReservationV2) => void
    onDeleteReservation: (r: ReservationV2) => void
    onCreateReservation: (date: string) => void
    refreshKey?: number
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
    onViewReservation,
    onEditReservation,
    onDeleteReservation,
    onCreateReservation,
    refreshKey = 0,
}: ConfirmadasPageProps) {
    const today = todayISO()
    const [month, setMonth] = useState(monthOf(new Date()))
    const [selectedDate, setSelectedDate] = useState(today)
    const [allConfirmed, setAllConfirmed] = useState<ReservationV2[]>([])
    const [initialLoading, setInitialLoading] = useState(true)

    // Fetch allConfirmed ONCE on initial load (and on refreshKey change)
    // Month navigation does NOT trigger refetch
    async function loadAllConfirmed() {
        setInitialLoading(true)
        try {
            const records = await listV2Records({ status: 'confirmed' })
            setAllConfirmed(records)
        } catch (e) {
            console.error('Failed to load confirmed records:', e)
        } finally {
            setInitialLoading(false)
        }
    }

    useEffect(() => {
        loadAllConfirmed()
    }, [refreshKey]) // Only refreshKey, NOT month

    // Derive month items from allConfirmed (for calendar indicators)
    const monthItems = useMemo(() => {
        const [y, m] = month.split('-')
        const prefix = `${y}-${m}`
        return allConfirmed.filter((r) => r.checkIn.startsWith(prefix))
    }, [allConfirmed, month])

    // Derive day items from allConfirmed (for selected day list)
    const dayItems = useMemo(
        () => allConfirmed.filter((i) => i.checkIn === selectedDate),
        [allConfirmed, selectedDate]
    )

    // Derive upcoming from allConfirmed (stable, no refetch)
    const upcomingItems = useMemo(
        () => getUpcomingReservations(allConfirmed, today, UPCOMING_LIMIT),
        [allConfirmed, today]
    )

    const isToday = selectedDate === today

    // Reservation card component for reuse
    function ReservationCard({ item, showDate = false }: { item: ReservationV2; showDate?: boolean }) {
        return (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm">
                <button
                    onClick={() => onViewReservation(item)}
                    className="text-left flex-1"
                >
                    <div className="font-medium text-gray-900">
                        {showDate && (
                            <span className="text-blue-600 mr-2">{formatBR(item.checkIn)}</span>
                        )}
                        {item.guestName}{' '}
                        <span className="text-gray-500">({item.partySize})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                        {!showDate && `Check-in ${formatBR(item.checkIn)} • `}Check-out {formatBR(item.checkOut)}
                    </div>
                </button>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm">{BRL(item.totalPrice)}</div>
                        <div className="text-xs text-gray-500">
                            {item.payment?.deposit?.paid ? 'Depósito pago' : 'Pendente'}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onViewReservation(item)}
                            className="btn-icon"
                            title="Ver"
                        >
                            <Eye size={16} />
                        </button>
                        {canWrite && (
                            <>
                                <button
                                    onClick={() => onEditReservation(item)}
                                    className="btn-icon"
                                    title="Editar"
                                >
                                    <Settings size={16} />
                                </button>
                                <button
                                    onClick={() => onDeleteReservation(item)}
                                    className="btn-icon text-red-500"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="pb-20">
            {/* Calendar Section */}
            <section className="card mb-4">
                <CalendarBoard
                    month={month}
                    onMonthChange={(m) => {
                        setMonth(m)
                    }}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                        setSelectedDate(d)
                    }}
                    items={monthItems}
                    roomsTotal={3}
                />
            </section>

            {/* Selected Day Section */}
            <section className="card mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">
                        {isToday ? 'Hoje' : formatBR(selectedDate)}
                    </h2>
                    {canWrite && (
                        <button
                            onClick={() => onCreateReservation(selectedDate)}
                            className="btn-icon"
                            title="Nova reserva"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>

                {initialLoading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : dayItems.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Sem reservas confirmadas para {isToday ? 'hoje' : 'este dia'}.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {dayItems.map((item) => (
                            <ReservationCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </section>

            {/* Upcoming Section */}
            <section className="card">
                <h2 className="text-lg font-semibold mb-3">Próximas</h2>

                {initialLoading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : upcomingItems.length === 0 ? (
                    <p className="text-sm text-gray-500">Sem próximas reservas confirmadas.</p>
                ) : (
                    <div className="space-y-2">
                        {upcomingItems.map((item) => (
                            <ReservationCard key={item.id} item={item} showDate />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

