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
    const [monthItems, setMonthItems] = useState<ReservationV2[]>([])
    const [allConfirmed, setAllConfirmed] = useState<ReservationV2[]>([])
    const [loading, setLoading] = useState(true)

    async function loadData() {
        setLoading(true)
        try {
            const [monthRecords, allRecords] = await Promise.all([
                listV2Records({ month, status: 'confirmed' }),
                listV2Records({ status: 'confirmed' }),
            ])
            setMonthItems(monthRecords)
            setAllConfirmed(allRecords)
        } catch (e) {
            console.error('Failed to load confirmed records:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [month, refreshKey])

    const dayItems = useMemo(
        () => monthItems.filter((i) => i.checkIn === selectedDate),
        [monthItems, selectedDate]
    )

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

                {loading ? (
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

                {loading ? (
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

