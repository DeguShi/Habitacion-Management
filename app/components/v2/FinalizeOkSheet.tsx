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
                <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{item.guestName}</div>
                    <div className="text-sm text-gray-500">
                        {item.checkIn} → {item.checkOut} • {BRL(item.totalPrice)}
                    </div>
                </div>

                {/* Extra Spend */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gastos extras (consumo, etc.)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                            type="number"
                            value={extraSpend}
                            onChange={(e) => setExtraSpend(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows={2}
                        placeholder="Notas sobre a estadia..."
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Confirmar OK'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
