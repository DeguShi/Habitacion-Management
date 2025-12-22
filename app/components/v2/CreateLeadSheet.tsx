'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { createWaitingLead } from '@/lib/data/v2'

interface Prefill {
    guestName?: string
    phone?: string
    email?: string
    partySize?: number
    notesInternal?: string
}

interface CreateLeadSheetProps {
    open: boolean
    onClose: () => void
    onCreated: () => void
    prefill?: Prefill
    prefillKey?: string // Changes when contact changes, triggers form reset
}

export default function CreateLeadSheet({ open, onClose, onCreated, prefill, prefillKey }: CreateLeadSheetProps) {
    const [guestName, setGuestName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [partySize, setPartySize] = useState('1')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Reset form when opening with new prefill
    // Dependencies include prefillKey to ensure form resets when contact changes
    useEffect(() => {
        if (open) {
            setGuestName(prefill?.guestName || '')
            setPhone(prefill?.phone || '')
            setEmail(prefill?.email || '')
            setCheckIn('')
            setCheckOut('')
            setPartySize(String(prefill?.partySize || 1))
            setNotes(prefill?.notesInternal || '')
            setError('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, prefillKey])

    function resetForm() {
        setGuestName('')
        setPhone('')
        setEmail('')
        setCheckIn('')
        setCheckOut('')
        setPartySize('1')
        setNotes('')
        setError('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!guestName.trim()) {
            setError('Nome é obrigatório')
            return
        }

        setSaving(true)
        try {
            await createWaitingLead({
                guestName: guestName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                checkIn: checkIn || undefined,
                checkOut: checkOut || undefined,
                partySize: parseInt(partySize) || 1,
                notesInternal: notes.trim() || undefined,
            })
            resetForm()
            onCreated()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao criar')
        } finally {
            setSaving(false)
        }
    }

    function handleClose() {
        resetForm()
        onClose()
    }

    return (
        <BottomSheet open={open} onClose={handleClose} title="Novo Pedido de Reserva">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Guest Name */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Nome do hóspede *
                    </label>
                    <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="input-app"
                        placeholder="João Silva"
                        autoFocus
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Telefone
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-app"
                        placeholder="+55 11 99999-9999"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-app"
                        placeholder="joao@email.com"
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">
                            Check-in
                        </label>
                        <input
                            type="date"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            className="input-app"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">
                            Check-out
                        </label>
                        <input
                            type="date"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="input-app"
                        />
                    </div>
                </div>

                {/* Party Size */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Pessoas
                    </label>
                    <input
                        type="number"
                        value={partySize}
                        onChange={(e) => setPartySize(e.target.value)}
                        min="1"
                        max="20"
                        className="input-app"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        Notas internas
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-app"
                        rows={2}
                        placeholder="Observações para a equipe..."
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="panel-danger text-sm px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn-ghost flex-1"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn flex-1"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar pedido'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
