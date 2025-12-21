'use client'

import { useState } from 'react'
import BottomSheet from './BottomSheet'
import type { ReservationV2 } from '@/core/entities_v2'

interface FinalizeIssueSheetProps {
    open: boolean
    onClose: () => void
    onSave: (reason: string) => void
    item: ReservationV2 | null
}

export default function FinalizeIssueSheet({ open, onClose, onSave, item }: FinalizeIssueSheetProps) {
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!reason.trim()) {
            setError('Por favor, descreva o problema')
            return
        }

        setSaving(true)
        onSave(reason.trim())
        setSaving(false)
    }

    const BRL = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    if (!item) return null

    return (
        <BottomSheet open={open} onClose={onClose} title="Registrar Problema">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="font-medium text-gray-900">{item.guestName}</div>
                    <div className="text-sm text-gray-500">
                        {item.checkIn} → {item.checkOut} • {BRL(item.totalPrice)}
                    </div>
                </div>

                <p className="text-sm text-gray-600">
                    Descreva o que aconteceu (ex: hóspede não apareceu, problema durante a estadia, etc.)
                </p>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo do problema *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        rows={3}
                        placeholder="Descreva o problema..."
                        required
                    />
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

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
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Registrar Problema'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
