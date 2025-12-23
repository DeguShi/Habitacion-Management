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
                <div className="panel-danger p-3 rounded-lg">
                    <div className="font-medium">{item.guestName}</div>
                    <div className="text-sm opacity-80">
                        {item.checkIn} → {item.checkOut} • {BRL(item.totalPrice)}
                    </div>
                </div>

                <p className="text-sm text-muted">
                    Descreva o que aconteceu (ex: hóspede não apareceu, problema durante a estadia, etc.)
                </p>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Motivo do problema *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--eco-border)] bg-[var(--eco-surface-alt)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Descreva o problema..."
                        required
                    />
                </div>

                {error && (
                    <div className="panel-danger text-sm px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

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
                        className="btn-danger flex-1"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Registrar Problema'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
