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

export default function ConfirmadasPage({
    canWrite,
    onViewReservation,
    onEditReservation,
    onDeleteReservation,
    onCreateReservation,
    refreshKey = 0,
}: ConfirmadasPageProps) {
    const [month, setMonth] = useState(monthOf(new Date()))
    const [selectedDate, setSelectedDate] = useState(todayISO())
    const [items, setItems] = useState<ReservationV2[]>([])
    const [loading, setLoading] = useState(true)

    async function loadMonth() {
        setLoading(true)
        try {
            const records = await listV2Records({ month, status: 'confirmed' })
            setItems(records)
        } catch (e) {
            console.error('Failed to load confirmed records:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMonth()
    }, [month, refreshKey])

    const dayItems = useMemo(
        () => items.filter((i) => i.checkIn === selectedDate),
        [items, selectedDate]
    )

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
                    items={items}
                    roomsTotal={3}
                />
            </section>

            {/* Day List Section */}
            <section className="card">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">{formatBR(selectedDate)}</h2>
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
                    <p className="text-sm text-gray-500">Sem reservas confirmadas para este dia.</p>
                ) : (
                    <div className="space-y-2">
                        {dayItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm"
                            >
                                <button
                                    onClick={() => onViewReservation(item)}
                                    className="text-left flex-1"
                                >
                                    <div className="font-medium text-gray-900">
                                        {item.guestName}{' '}
                                        <span className="text-gray-500">({item.partySize})</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Check-in {formatBR(item.checkIn)} • Check-out {formatBR(item.checkOut)}
                                    </div>
                                </button>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm">{BRL(item.totalPrice)}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.payment?.deposit?.paid ? 'Depósito pago' : 'Depósito pendente'}
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
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
