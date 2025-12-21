'use client'

import { useState, useRef, useMemo } from 'react'
import { Check, X, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, Eye } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'
import { rejectRecord, restoreToWaiting } from '@/lib/data/v2'
import { getBookedRoomsByDay, MAX_ROOMS } from '@/lib/calendar-utils'

interface EmEsperaPageProps {
    canWrite: boolean
    waitingRecords: ReservationV2[]
    rejectedRecords: ReservationV2[]
    confirmedRecords?: ReservationV2[]  // For availability check
    loading: boolean
    onConfirmWithDetails: (r: ReservationV2) => void
    onRefresh: () => void
    onViewReservation?: (r: ReservationV2) => void
}

function formatBR(iso: string) {
    const [y, m, day] = iso.split('-')
    return `${day}/${m}/${y}`
}

/**
 * Check if any night in the date range is fully booked
 */
function hasConflict(
    checkIn: string,
    checkOut: string,
    confirmedRecords: ReservationV2[]
): boolean {
    const [y, m] = checkIn.split('-').map(Number)
    const monthKey = `${y}-${String(m).padStart(2, '0')}`
    const bookedByDay = getBookedRoomsByDay(confirmedRecords, monthKey, MAX_ROOMS)

    // Check every night from checkIn to checkOut-1
    const start = new Date(checkIn)
    const end = new Date(checkOut)

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0]
        const booked = bookedByDay.get(key) || 0
        if (booked >= MAX_ROOMS) return true
    }
    return false
}

export default function EmEsperaPage({
    canWrite,
    waitingRecords,
    rejectedRecords,
    confirmedRecords = [],
    loading,
    onConfirmWithDetails,
    onRefresh,
    onViewReservation,
}: EmEsperaPageProps) {
    const [showRejected, setShowRejected] = useState(false)
    const [swipeId, setSwipeId] = useState<string | null>(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const touchStartX = useRef(0)

    // Reject confirmation dialog state
    const [pendingReject, setPendingReject] = useState<ReservationV2 | null>(null)
    const [rejecting, setRejecting] = useState(false)

    // Sort locally
    const waitingItems = [...waitingRecords].sort(
        (a, b) => a.checkIn.localeCompare(b.checkIn)
    )
    const rejectedItems = [...rejectedRecords].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt)
    )

    // Pre-compute conflicts for all waiting items
    const conflictMap = useMemo(() => {
        const map = new Map<string, boolean>()
        for (const item of waitingRecords) {
            map.set(item.id, hasConflict(item.checkIn, item.checkOut, confirmedRecords))
        }
        return map
    }, [waitingRecords, confirmedRecords])

    function handleConfirm(item: ReservationV2) {
        if (!canWrite) return
        onConfirmWithDetails(item)
    }

    // Show confirmation dialog instead of immediate reject
    function handleRejectClick(item: ReservationV2) {
        if (!canWrite) return
        setPendingReject(item)
    }

    async function confirmReject() {
        if (!pendingReject) return
        setRejecting(true)
        try {
            await rejectRecord(pendingReject.id)
            onRefresh()
        } catch (e) {
            console.error('Failed to reject:', e)
            alert('Erro ao rejeitar reserva')
        } finally {
            setRejecting(false)
            setPendingReject(null)
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
            handleRejectClick(item)  // Changed: show dialog instead
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
                            Deslize para direita para confirmar, esquerda para cancelar
                        </p>
                        {waitingItems.map((item) => {
                            const isActive = swipeId === item.id
                            const offset = isActive ? swipeOffset : 0
                            const bgColor =
                                offset > 40 ? 'bg-green-100' : offset < -40 ? 'bg-red-100' : 'bg-white'
                            const hasDateConflict = conflictMap.get(item.id)

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
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {item.guestName}{' '}
                                                    <span className="text-gray-500">({item.partySize})</span>
                                                    {hasDateConflict && (
                                                        <span className="text-amber-500" title="Algumas datas estão lotadas">
                                                            <AlertTriangle size={16} />
                                                        </span>
                                                    )}
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
                                                    {onViewReservation && (
                                                        <button
                                                            onClick={() => onViewReservation(item)}
                                                            className="btn-icon text-blue-500"
                                                            title="Ver detalhes"
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleConfirm(item)}
                                                        className="btn-icon text-green-600"
                                                        title="Confirmar"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectClick(item)}
                                                        className="btn-icon text-red-500"
                                                        title="Cancelar pedido"
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
                            Canceladas ({rejectedItems.length})
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

            {/* Reject Confirmation Dialog */}
            {pendingReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Cancelar pedido?
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Isso vai mover para Canceladas. Você pode restaurar depois.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            <strong>{pendingReject.guestName}</strong> — {formatBR(pendingReject.checkIn)}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingReject(null)}
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium"
                                disabled={rejecting}
                            >
                                Voltar
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={rejecting}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                            >
                                {rejecting ? 'Cancelando...' : 'Cancelar pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
