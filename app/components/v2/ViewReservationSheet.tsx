'use client'

import { useState } from 'react'
import { Download, Share2, Pencil } from 'lucide-react'
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

// Formats birthDate for display (handles both DD/MM/YYYY and ISO formats)
function formatBirthForView(s: string) {
    if (!s) return ''
    // If ISO format (YYYY-MM-DD), convert to DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-')
        return `${d}/${m}/${y}`
    }
    return s
}

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
                <div className="bg-s2 rounded-xl p-4">
                    <h3 className="text-xl font-semibold text-app">{record.guestName}</h3>
                    {record.phone && (
                        <p className="text-sm text-muted">{record.phone}</p>
                    )}
                    {record.email && (
                        <p className="text-sm text-muted">{record.email}</p>
                    )}
                    {record.birthDate && (
                        <p className="text-sm text-muted">Aniversário: {formatBirthForView(record.birthDate)}</p>
                    )}
                </div>

                {/* Dates & Details */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Check-in</p>
                        <p className="font-medium text-app">{formatDateBR(record.checkIn)}</p>
                    </div>
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Check-out</p>
                        <p className="font-medium text-app">{formatDateBR(record.checkOut)}</p>
                    </div>
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Noites</p>
                        <p className="font-medium text-app">{nights}</p>
                    </div>
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Hóspedes</p>
                        <p className="font-medium text-app">{record.partySize || 1}</p>
                    </div>
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Quartos</p>
                        <p className="font-medium text-app">{record.rooms ?? 1}</p>
                    </div>
                    <div className="bg-s2 rounded-xl p-3">
                        <p className="text-xs text-muted">Café</p>
                        <p className="font-medium text-app">{record.breakfastIncluded ? 'Sim' : 'Não'}</p>
                    </div>
                </div>

                {/* Pricing */}
                <div className="panel-success rounded-xl p-4">
                    <div className="flex justify-between items-center">
                        <span>Total</span>
                        <span className="text-xl font-bold">
                            {formatMoneyBRL(record.totalPrice)}
                        </span>
                    </div>
                    {totalPaid > 0 && (
                        <>
                            <div className="flex justify-between items-center mt-2 text-sm opacity-80">
                                <span>Pago</span>
                                <span>{formatMoneyBRL(totalPaid)}</span>
                            </div>
                            <div className="text-xs mt-1 opacity-80">✓ Sinal pago</div>
                        </>
                    )}
                </div>

                {/* Pagamentos */}
                {record.payment?.events && record.payment.events.length > 0 && (
                    <div className="bg-s2 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-muted mb-2">Pagamentos</h4>
                        <div className="space-y-2">
                            {record.payment.events.map((event, idx) => (
                                <div key={event.id || idx} className="flex justify-between text-sm">
                                    <div>
                                        <span className="text-app">{event.note || 'Pagamento'}</span>
                                        {event.date && (
                                            <span className="text-muted text-xs ml-2">
                                                {formatDateBR(event.date)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-medium text-success">
                                        {formatMoneyBRL(event.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* Notes */}
                {(record.notesInternal || record.notesGuest) && (
                    <div className="bg-s2 rounded-xl p-4 space-y-2">
                        {record.notesInternal && (
                            <div>
                                <p className="text-xs text-muted">Notas internas</p>
                                <p className="text-sm text-app">{record.notesInternal}</p>
                            </div>
                        )}
                        {record.notesGuest && (
                            <div>
                                <p className="text-xs text-muted">Notas para hóspede</p>
                                <p className="text-sm text-app">{record.notesGuest}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-sm text-danger text-center">{error}</div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleEdit}
                        className="btn-ghost flex-1 flex items-center justify-center gap-2"
                    >
                        <Pencil size={18} />
                        Editar
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={generating}
                        className="btn flex-1 flex items-center justify-center gap-2"
                    >
                        <Share2 size={18} />
                        {generating ? 'Gerando...' : 'Compartilhar'}
                    </button>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={generating}
                    className="btn-ghost w-full flex items-center justify-center gap-2"
                >
                    <Download size={18} />
                    Baixar imagem
                </button>
            </div>
        </BottomSheet>
    )
}
