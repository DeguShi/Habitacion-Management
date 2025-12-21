'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'
import { listV2Records, confirmRecord, rejectRecord, restoreToWaiting } from '@/lib/data/v2'

interface EmEsperaPageProps {
    canWrite: boolean
    onConfirmWithDetails: (r: ReservationV2) => void
    refreshKey?: number
    onRefresh: () => void
}

function formatBR(iso: string) {
    const [y, m, day] = iso.split('-')
    return `${day}/${m}/${y}`
}

export default function EmEsperaPage({
    canWrite,
    onConfirmWithDetails,
    refreshKey = 0,
    onRefresh,
}: EmEsperaPageProps) {
    const [waitingItems, setWaitingItems] = useState<ReservationV2[]>([])
    const [rejectedItems, setRejectedItems] = useState<ReservationV2[]>([])
    const [loading, setLoading] = useState(true)
    const [showRejected, setShowRejected] = useState(false)
    const [swipeId, setSwipeId] = useState<string | null>(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const touchStartX = useRef(0)

    async function loadItems() {
        setLoading(true)
        try {
            const [waiting, rejected] = await Promise.all([
                listV2Records({ status: 'waiting' }),
                listV2Records({ status: 'rejected' }),
            ])
            // Sort by checkIn
            waiting.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
            rejected.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            setWaitingItems(waiting)
            setRejectedItems(rejected)
        } catch (e) {
            console.error('Failed to load waiting items:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadItems()
    }, [refreshKey])

    async function handleConfirm(item: ReservationV2) {
        if (!canWrite) return
        onConfirmWithDetails(item)
    }

    async function handleReject(item: ReservationV2) {
        if (!canWrite) return
        try {
            await rejectRecord(item.id)
            onRefresh()
        } catch (e) {
            console.error('Failed to reject:', e)
            alert('Erro ao rejeitar reserva')
        }
    }

    async function handleRestore(item: ReservationV2) {
        if (!canWrite) return
        try {
            await restoreToWaiting(item.id)
            onRefresh()
        } catch (e) {
            console.error('Failed to restore:', e)
            alert('Erro ao restaurar reserva')
        }
    }

    // Touch handlers for swipe
    function handleTouchStart(id: string, e: React.TouchEvent) {
        setSwipeId(id)
        touchStartX.current = e.touches[0].clientX
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (!swipeId) return
        const diff = e.touches[0].clientX - touchStartX.current
        setSwipeOffset(Math.max(-120, Math.min(120, diff)))
    }

    function handleTouchEnd(item: ReservationV2) {
        if (swipeOffset > 80) {
            handleConfirm(item)
        } else if (swipeOffset < -80) {
            handleReject(item)
        }
        setSwipeId(null)
        setSwipeOffset(0)
    }

    return (
        <div className="pb-20">
            <section className="card">
                <h2 className="text-lg font-semibold mb-3">Lista de Espera</h2>

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : waitingItems.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma reserva em espera.</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 mb-2">
                            Deslize para direita para confirmar, esquerda para rejeitar
                        </p>
                        {waitingItems.map((item) => {
                            const isActive = swipeId === item.id
                            const offset = isActive ? swipeOffset : 0
                            const bgColor =
                                offset > 40 ? 'bg-green-100' : offset < -40 ? 'bg-red-100' : 'bg-white'

                            return (
                                <div
                                    key={item.id}
                                    className={`relative overflow-hidden rounded-xl shadow-sm ${bgColor} transition-colors`}
                                    onTouchStart={(e) => handleTouchStart(item.id, e)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={() => handleTouchEnd(item)}
                                >
                                    {/* Swipe indicators */}
                                    <div className="absolute inset-y-0 left-2 flex items-center text-green-600 opacity-50">
                                        <Check size={24} />
                                    </div>
                                    <div className="absolute inset-y-0 right-2 flex items-center text-red-600 opacity-50">
                                        <X size={24} />
                                    </div>

                                    <div
                                        className="relative bg-white p-3 transition-transform"
                                        style={{ transform: `translateX(${offset}px)` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {item.guestName}{' '}
                                                    <span className="text-gray-500">({item.partySize})</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Check-in {formatBR(item.checkIn)} • Check-out {formatBR(item.checkOut)}
                                                </div>
                                                {item.phone && (
                                                    <div className="text-xs text-gray-400">{item.phone}</div>
                                                )}
                                            </div>

                                            {canWrite && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleConfirm(item)}
                                                        className="btn-icon text-green-600"
                                                        title="Confirmar"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(item)}
                                                        className="btn-icon text-red-500"
                                                        title="Rejeitar"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Rejected section toggle */}
            {rejectedItems.length > 0 && (
                <section className="card mt-4">
                    <button
                        onClick={() => setShowRejected(!showRejected)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <span className="text-sm text-gray-500">
                            Rejeitadas ({rejectedItems.length})
                        </span>
                        {showRejected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showRejected && (
                        <div className="mt-3 space-y-2">
                            {rejectedItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                                >
                                    <div className="flex-1 opacity-60">
                                        <div className="font-medium text-gray-700">{item.guestName}</div>
                                        <div className="text-xs text-gray-400">
                                            {formatBR(item.checkIn)} - {formatBR(item.checkOut)}
                                        </div>
                                    </div>

                                    {canWrite && (
                                        <button
                                            onClick={() => handleRestore(item)}
                                            className="btn-icon text-blue-500"
                                            title="Restaurar para lista de espera"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
