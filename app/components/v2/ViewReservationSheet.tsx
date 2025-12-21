'use client'

import { useState } from 'react'
import { Eye, Download, Share2, Pencil, X } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { ReservationV2 } from '@/core/entities_v2'
import {
    formatDateBR,
    formatMoneyBRL,
    getStatusLabel,
    getStatusColor,
    renderConfirmationCard,
    downloadBlob,
    shareFile
} from '@/lib/confirmation-card'

interface ViewReservationSheetProps {
    open: boolean
    onClose: () => void
    onEdit: (item: ReservationV2) => void
    item: ReservationV2 | null
}

export default function ViewReservationSheet({
    open,
    onClose,
    onEdit,
    item
}: ViewReservationSheetProps) {
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!item) return null

    // TypeScript doesn't narrow item for nested functions after early return
    // Create local non-null reference
    const record = item

    // Calculate nights
    const nights = (() => {
        if (!record.checkIn || !record.checkOut) return 1
        const d1 = new Date(record.checkIn + 'T00:00:00')
        const d2 = new Date(record.checkOut + 'T00:00:00')
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    // Calculate total paid from payment events
    const totalPaid = (() => {
        if (!record.payment?.events) return 0
        return record.payment.events.reduce((sum, e) => sum + (e.amount || 0), 0)
    })()

    async function handleDownload() {
        setGenerating(true)
        setError(null)
        try {
            const blob = await renderConfirmationCard(record)
            const filename = `reserva-${record.guestName.replace(/\s+/g, '-').toLowerCase()}.png`
            downloadBlob(blob, filename)
        } catch (e: any) {
            console.error('Failed to generate card:', e)
            setError('Erro ao gerar imagem')
        } finally {
            setGenerating(false)
        }
    }

    async function handleShare() {
        setGenerating(true)
        setError(null)
        try {
            const blob = await renderConfirmationCard(record)
            const filename = `reserva-${record.guestName.replace(/\s+/g, '-').toLowerCase()}.png`
            await shareFile(blob, filename, `Reserva - ${record.guestName}`)
        } catch (e: any) {
            // AbortError = user cancelled, do nothing
            if (e.name === 'AbortError') {
                // User cancelled sharing - do nothing
            } else if (e.message === 'SHARE_NOT_SUPPORTED') {
                setError('Compartilhamento não suportado. Use "Baixar imagem".')
            } else {
                console.error('Failed to share:', e)
                setError('Erro ao compartilhar')
            }
        } finally {
            setGenerating(false)
        }
    }

    function handleEdit() {
        onClose()
        onEdit(record)
    }

    const statusLabel = getStatusLabel(record.status)
    const statusColor = getStatusColor(record.status)

    return (
        <BottomSheet open={open} onClose={onClose} title="Detalhes da Reserva">
            <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: statusColor }}
                    >
                        {statusLabel}
                    </span>
                </div>

                {/* Guest Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-xl font-semibold text-gray-900">{record.guestName}</h3>
                    {record.phone && (
                        <p className="text-sm text-gray-600">{record.phone}</p>
                    )}
                    {record.email && (
                        <p className="text-sm text-gray-600">{record.email}</p>
                    )}
                </div>

                {/* Dates & Details */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Check-in</p>
                        <p className="font-medium">{formatDateBR(record.checkIn)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Check-out</p>
                        <p className="font-medium">{formatDateBR(record.checkOut)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Noites</p>
                        <p className="font-medium">{nights}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Hóspedes</p>
                        <p className="font-medium">{record.partySize || 1}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Quartos</p>
                        <p className="font-medium">{record.rooms ?? 1}</p>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total</span>
                        <span className="text-xl font-bold text-green-700">
                            {formatMoneyBRL(record.totalPrice)}
                        </span>
                    </div>
                    {totalPaid > 0 && (
                        <>
                            <div className="flex justify-between items-center mt-2 text-sm">
                                <span className="text-gray-500">Pago</span>
                                <span className="text-green-600">{formatMoneyBRL(totalPaid)}</span>
                            </div>
                            <div className="text-xs text-green-600 mt-1">✓ Sinal pago</div>
                        </>
                    )}
                </div>

                {/* Pagamentos */}
                {record.payment?.events && record.payment.events.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Pagamentos</h4>
                        <div className="space-y-2">
                            {record.payment.events.map((event, idx) => (
                                <div key={event.id || idx} className="flex justify-between text-sm">
                                    <div>
                                        <span className="text-gray-700">{event.note || 'Pagamento'}</span>
                                        {event.date && (
                                            <span className="text-gray-400 text-xs ml-2">
                                                {formatDateBR(event.date)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-medium text-green-700">
                                        {formatMoneyBRL(event.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* Notes */}
                {(record.notesInternal || record.notesGuest) && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        {record.notesInternal && (
                            <div>
                                <p className="text-xs text-gray-500">Notas internas</p>
                                <p className="text-sm text-gray-700">{record.notesInternal}</p>
                            </div>
                        )}
                        {record.notesGuest && (
                            <div>
                                <p className="text-xs text-gray-500">Notas para hóspede</p>
                                <p className="text-sm text-gray-700">{record.notesGuest}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-sm text-red-600 text-center">{error}</div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleEdit}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium"
                    >
                        <Pencil size={18} />
                        Editar
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={generating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
                    >
                        <Share2 size={18} />
                        {generating ? 'Gerando...' : 'Compartilhar'}
                    </button>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium disabled:opacity-50"
                >
                    <Download size={18} />
                    Baixar imagem
                </button>
            </div>
        </BottomSheet>
    )
}
