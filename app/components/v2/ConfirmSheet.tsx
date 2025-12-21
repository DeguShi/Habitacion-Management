'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { confirmWaitingLead } from '@/lib/data/v2'
import type { ReservationV2 } from '@/core/entities_v2'

interface ConfirmSheetProps {
    open: boolean
    onClose: () => void
    onConfirmed: () => void
    item: ReservationV2 | null
}

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Outro']

export default function ConfirmSheet({ open, onClose, onConfirmed, item }: ConfirmSheetProps) {
    // Form state
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [partySize, setPartySize] = useState('2')
    const [nightlyRate, setNightlyRate] = useState('250')
    const [breakfastIncluded, setBreakfastIncluded] = useState(false)
    const [breakfastRate, setBreakfastRate] = useState('30')
    const [manualLodging, setManualLodging] = useState(false)
    const [manualTotal, setManualTotal] = useState('')
    const [depositAmount, setDepositAmount] = useState('')
    const [depositMethod, setDepositMethod] = useState('Pix')
    const [depositNote, setDepositNote] = useState('')
    const [notesInternal, setNotesInternal] = useState('')
    const [notesGuest, setNotesGuest] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Prefill from item
    useEffect(() => {
        if (item && open) {
            setCheckIn(item.checkIn || '')
            setCheckOut(item.checkOut || '')
            setPartySize(String(item.partySize || 2))
            setNightlyRate(String(item.nightlyRate || 250))
            setBreakfastIncluded(item.breakfastIncluded || false)
            setBreakfastRate(String(item.breakfastPerPersonPerNight || 30))
            setManualLodging(item.manualLodgingEnabled || false)
            setManualTotal(item.manualLodgingTotal ? String(item.manualLodgingTotal) : '')
            setNotesInternal(item.notesInternal || '')
            setNotesGuest(item.notesGuest || '')
            setDepositAmount('')
            setDepositMethod('Pix')
            setDepositNote('')
            setError('')
        }
    }, [item, open])

    // Auto-set checkOut if missing
    useEffect(() => {
        if (checkIn && !checkOut) {
            const d = new Date(checkIn)
            d.setDate(d.getDate() + 1)
            setCheckOut(d.toISOString().slice(0, 10))
        }
    }, [checkIn, checkOut])

    // Calculate preview
    const nights = (() => {
        if (!checkIn || !checkOut) return 0
        const d1 = new Date(checkIn)
        const d2 = new Date(checkOut)
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    const party = parseInt(partySize) || 1
    const rate = parseFloat(nightlyRate) || 0
    const bRate = parseFloat(breakfastRate) || 0
    const mTotal = parseFloat(manualTotal) || 0

    const lodgingPreview = manualLodging && mTotal > 0 ? mTotal : nights * rate * party
    const breakfastPreview = breakfastIncluded ? nights * party * bRate : 0
    const totalPreview = lodgingPreview + breakfastPreview

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!item) return

        // Validate
        if (!checkIn) {
            setError('Check-in é obrigatório')
            return
        }
        if (!checkOut || checkOut <= checkIn) {
            setError('Check-out deve ser depois do check-in')
            return
        }

        setSaving(true)
        try {
            await confirmWaitingLead(item.id, {
                checkIn,
                checkOut,
                partySize: party,
                nightlyRate: rate,
                breakfastIncluded,
                breakfastPerPersonPerNight: bRate,
                manualLodgingEnabled: manualLodging,
                manualLodgingTotal: manualLodging ? mTotal : undefined,
                depositPaidAmount: parseFloat(depositAmount) || undefined,
                depositMethod: depositMethod || undefined,
                depositNote: depositNote.trim() || undefined,
                notesInternal: notesInternal.trim() || undefined,
                notesGuest: notesGuest.trim() || undefined,
            })
            onConfirmed()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar')
        } finally {
            setSaving(false)
        }
    }

    const BRL = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    return (
        <BottomSheet open={open} onClose={onClose} title="Confirmar Reserva">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Guest Info (read-only summary) */}
                {item && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-900">{item.guestName}</div>
                        <div className="text-sm text-gray-500">
                            {item.phone || item.email || 'Sem contato'}
                        </div>
                    </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-in *
                        </label>
                        <input
                            type="date"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-out *
                        </label>
                        <input
                            type="date"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                {/* Party Size & Rate */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pessoas
                        </label>
                        <input
                            type="number"
                            value={partySize}
                            onChange={(e) => setPartySize(e.target.value)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Diária (R$)
                        </label>
                        <input
                            type="number"
                            value={nightlyRate}
                            onChange={(e) => setNightlyRate(e.target.value)}
                            min="0"
                            step="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={manualLodging}
                        />
                    </div>
                </div>

                {/* Manual Lodging */}
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="manualLodging"
                        checked={manualLodging}
                        onChange={(e) => setManualLodging(e.target.checked)}
                        className="rounded"
                    />
                    <label htmlFor="manualLodging" className="text-sm text-gray-700">
                        Valor manual de hospedagem
                    </label>
                </div>
                {manualLodging && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total hospedagem (R$)
                        </label>
                        <input
                            type="number"
                            value={manualTotal}
                            onChange={(e) => setManualTotal(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Breakfast */}
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="breakfast"
                        checked={breakfastIncluded}
                        onChange={(e) => setBreakfastIncluded(e.target.checked)}
                        className="rounded"
                    />
                    <label htmlFor="breakfast" className="text-sm text-gray-700">
                        Inclui café da manhã
                    </label>
                </div>
                {breakfastIncluded && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Café por pessoa/noite (R$)
                        </label>
                        <input
                            type="number"
                            value={breakfastRate}
                            onChange={(e) => setBreakfastRate(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Price Preview */}
                <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Hospedagem ({nights} noites)</span>
                        <span>{BRL(lodgingPreview)}</span>
                    </div>
                    {breakfastIncluded && (
                        <div className="flex justify-between text-sm">
                            <span>Café da manhã</span>
                            <span>{BRL(breakfastPreview)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                        <span>Total</span>
                        <span>{BRL(totalPreview)}</span>
                    </div>
                </div>

                {/* Payment */}
                <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">Pagamento</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valor pago (R$)
                            </label>
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Método
                            </label>
                            <select
                                value={depositMethod}
                                onChange={(e) => setDepositMethod(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-3">
                        <input
                            type="text"
                            value={depositNote}
                            onChange={(e) => setDepositNote(e.target.value)}
                            placeholder="Nota do pagamento (opcional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="border-t pt-4 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas internas
                        </label>
                        <textarea
                            value={notesInternal}
                            onChange={(e) => setNotesInternal(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Visível apenas para a equipe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas para o hóspede
                        </label>
                        <textarea
                            value={notesGuest}
                            onChange={(e) => setNotesGuest(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Será incluído na confirmação"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
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
                        {saving ? 'Confirmando...' : 'Confirmar Reserva'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
