'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import type { ReservationV2 } from '@/core/entities_v2'

interface FinalizeOkSheetProps {
    open: boolean
    onClose: () => void
    onSave: (extraSpend: number, notes?: string) => void
    item: ReservationV2 | null
}

export default function FinalizeOkSheet({ open, onClose, onSave, item }: FinalizeOkSheetProps) {
    const [extraSpend, setExtraSpend] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    // Reset when opening
    useEffect(() => {
        if (open && item) {
            setExtraSpend(item.extraSpend ? String(item.extraSpend) : '')
            setNotes('')
        }
    }, [open, item])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const extra = parseFloat(extraSpend) || 0
        onSave(extra, notes.trim() || undefined)
        setSaving(false)
    }

    const BRL = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    if (!item) return null

    return (
        <BottomSheet open={open} onClose={onClose} title="Finalizar Estadia - OK">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-s2 p-3 rounded-lg">
                    <div className="font-medium text-app">{item.guestName}</div>
                    <div className="text-sm text-muted">
                        {item.checkIn} → {item.checkOut} • {BRL(item.totalPrice)}
                    </div>
                </div>

                {/* Extra Spend */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Gastos extras (consumo, etc.)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">R$</span>
                        <input
                            type="number"
                            value={extraSpend}
                            onChange={(e) => setExtraSpend(e.target.value)}
                            className="w-full px-3 py-2 pl-10 border border-[var(--eco-border)] bg-[var(--eco-surface-alt)] rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Observações (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--eco-border)] bg-[var(--eco-surface-alt)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Notas sobre a estadia..."
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost flex-1"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-success flex-1"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Confirmar OK'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
