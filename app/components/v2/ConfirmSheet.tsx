'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { confirmWaitingLead, createConfirmedReservation } from '@/lib/data/v2'
import type { ReservationV2 } from '@/core/entities_v2'

interface ConfirmSheetProps {
    open: boolean
    onClose: () => void
    onConfirmed: () => void
    item: ReservationV2 | null // null = create mode
}

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Outro']
const ROOMS_OPTIONS = [1, 2, 3, 4]

// localStorage keys
const LS_NIGHTLY_RATE = 'hab:lastNightlyRate'
const LS_BREAKFAST_RATE = 'hab:lastBreakfastRate'

/**
 * Gets today's date in YYYY-MM-DD format (local timezone).
 */
function todayLocal(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Gets tomorrow's date in YYYY-MM-DD format (local timezone).
 */
function tomorrowLocal(): string {
    const now = new Date()
    now.setDate(now.getDate() + 1)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Safely reads from localStorage (client-only).
 */
function getStoredRate(key: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback
    try {
        return localStorage.getItem(key) || fallback
    } catch {
        return fallback
    }
}

/**
 * Safely writes to localStorage (client-only).
 */
function setStoredRate(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(key, value)
    } catch {
        // ignore
    }
}

export default function ConfirmSheet({ open, onClose, onConfirmed, item }: ConfirmSheetProps) {
    // Determine if we're in create mode (no existing item)
    const isCreateMode = item === null

    // Guest info (editable in create mode)
    const [guestName, setGuestName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')

    // Form state
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [partySize, setPartySize] = useState('1')
    const [rooms, setRooms] = useState('1')
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

    // Reset/prefill from item
    useEffect(() => {
        if (open) {
            if (item) {
                // Confirm mode: prefill from existing item
                setGuestName(item.guestName || '')
                setPhone(item.phone || '')
                setEmail(item.email || '')
                setCheckIn(item.checkIn || '')
                setCheckOut(item.checkOut || '')
                setPartySize(String(item.partySize || 1))
                setRooms(String(item.rooms ?? 1))
                setNightlyRate(String(item.nightlyRate || getStoredRate(LS_NIGHTLY_RATE, '250')))
                setBreakfastIncluded(item.breakfastIncluded || false)
                setBreakfastRate(String(item.breakfastPerPersonPerNight || getStoredRate(LS_BREAKFAST_RATE, '30')))
                setManualLodging(item.manualLodgingEnabled || false)
                setManualTotal(item.manualLodgingTotal ? String(item.manualLodgingTotal) : '')
                setNotesInternal(item.notesInternal || '')
                setNotesGuest(item.notesGuest || '')
            } else {
                // Create mode: reset to defaults with today/tomorrow and localStorage rates
                setGuestName('')
                setPhone('')
                setEmail('')
                setCheckIn(todayLocal())
                setCheckOut(tomorrowLocal())
                setPartySize('1')
                setRooms('1')
                setNightlyRate(getStoredRate(LS_NIGHTLY_RATE, '250'))
                setBreakfastIncluded(false)
                setBreakfastRate(getStoredRate(LS_BREAKFAST_RATE, '30'))
                setManualLodging(false)
                setManualTotal('')
                setNotesInternal('')
                setNotesGuest('')
            }
            setDepositAmount('')
            setDepositMethod('Pix')
            setDepositNote('')
            setError('')
        }
    }, [item, open])

    // Auto-set checkOut if checkIn changes and checkOut is before checkIn
    useEffect(() => {
        if (checkIn && checkOut && checkOut <= checkIn) {
            const d = new Date(checkIn + 'T00:00:00') // Parse as local
            d.setDate(d.getDate() + 1)
            const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            setCheckOut(next)
        }
    }, [checkIn, checkOut])

    // Calculate preview
    const nights = (() => {
        if (!checkIn || !checkOut) return 0
        const d1 = new Date(checkIn + 'T00:00:00')
        const d2 = new Date(checkOut + 'T00:00:00')
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    const party = parseInt(partySize) || 1
    const roomCount = Math.min(4, Math.max(1, parseInt(rooms) || 1))
    const rate = parseFloat(nightlyRate) || 0
    const bRate = parseFloat(breakfastRate) || 0
    const mTotal = parseFloat(manualTotal) || 0

    const lodgingPreview = manualLodging && mTotal > 0 ? mTotal : nights * rate * party
    const breakfastPreview = breakfastIncluded ? nights * party * bRate : 0
    const totalPreview = lodgingPreview + breakfastPreview

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        // Validate guest name (required for create mode)
        if (isCreateMode && !guestName.trim()) {
            setError('Nome do hóspede é obrigatório')
            return
        }

        // Validate dates
        if (!checkIn) {
            setError('Check-in é obrigatório')
            return
        }
        if (!checkOut || checkOut <= checkIn) {
            setError('Check-out deve ser depois do check-in')
            return
        }

        // Validate pricing
        if (!manualLodging && rate <= 0) {
            setError('Diária deve ser maior que zero')
            return
        }
        if (manualLodging && mTotal <= 0) {
            setError('Valor manual deve ser maior que zero')
            return
        }

        setSaving(true)
        try {
            if (isCreateMode) {
                // Create new confirmed reservation via helper
                await createConfirmedReservation({
                    guestName: guestName.trim(),
                    phone: phone.trim() || undefined,
                    email: email.trim() || undefined,
                    checkIn,
                    checkOut,
                    partySize: party,
                    rooms: roomCount,
                    nightlyRate: manualLodging ? 0 : rate,
                    breakfastIncluded,
                    breakfastPerPersonPerNight: bRate,
                    manualLodgingEnabled: manualLodging,
                    manualLodgingTotal: manualLodging ? mTotal : undefined,
                    depositPaidAmount: parseFloat(depositAmount) || undefined,
                    depositMethod: depositMethod,
                    depositNote: depositNote.trim() || undefined,
                    notesInternal: notesInternal.trim() || undefined,
                    notesGuest: notesGuest.trim() || undefined,
                })
            } else {
                // Confirm existing waiting item
                await confirmWaitingLead(item!.id, {
                    checkIn,
                    checkOut,
                    partySize: party,
                    rooms: roomCount,
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
            }

            // Persist last-used rates after successful save
            if (!manualLodging && rate > 0) {
                setStoredRate(LS_NIGHTLY_RATE, String(rate))
            }
            if (breakfastIncluded && bRate > 0) {
                setStoredRate(LS_BREAKFAST_RATE, String(bRate))
            }

            onConfirmed()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const BRL = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    const title = isCreateMode ? 'Nova Reserva' : 'Confirmar Reserva'
    const submitLabel = isCreateMode ? 'Salvar reserva' : 'Confirmar'

    return (
        <BottomSheet open={open} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Guest Info */}
                {isCreateMode ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do hóspede *
                            </label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="João Silva"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-900">{item?.guestName}</div>
                        <div className="text-sm text-gray-500">
                            {item?.phone || item?.email || 'Sem contato'}
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

                {/* Party Size, Rooms & Rate */}
                <div className="grid grid-cols-3 gap-3">
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
                            Quartos
                        </label>
                        <select
                            value={rooms}
                            onChange={(e) => setRooms(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {ROOMS_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Diária
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
                    <input
                        type="number"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        min="0"
                        placeholder="Total hospedagem"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                    <input
                        type="number"
                        value={breakfastRate}
                        onChange={(e) => setBreakfastRate(e.target.value)}
                        min="0"
                        placeholder="Café por pessoa/noite"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                                Valor pago
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
                    <input
                        type="text"
                        value={depositNote}
                        onChange={(e) => setDepositNote(e.target.value)}
                        placeholder="Nota do pagamento"
                        className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                        {saving ? 'Salvando...' : submitLabel}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
