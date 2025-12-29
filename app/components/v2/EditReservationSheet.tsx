'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { updateV2Record, addPaymentEvent, removePaymentEvent } from '@/lib/data/v2'
import type { ReservationV2, PaymentEvent } from '@/core/entities_v2'
import ToggleSwitch from '../ui/ToggleSwitch'
import { formatBirthInput, formatBirthForDisplay } from '@/lib/birthdate'

interface EditReservationSheetProps {
    open: boolean
    onClose: () => void
    onSaved: () => Promise<void> | void
    item: ReservationV2 | null
}

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Outro']
const ROOMS_OPTIONS = [1, 2, 3, 4]

export default function EditReservationSheet({ open, onClose, onSaved, item }: EditReservationSheetProps) {
    // Guest info
    const [guestName, setGuestName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')

    // Dates
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [partySize, setPartySize] = useState('2')
    const [rooms, setRooms] = useState('1')

    // Pricing
    const [nightlyRate, setNightlyRate] = useState('250')
    const [breakfastIncluded, setBreakfastIncluded] = useState(false)
    const [breakfastRate, setBreakfastRate] = useState('0')
    const [manualLodging, setManualLodging] = useState(false)
    const [manualTotal, setManualTotal] = useState('')
    const [extraSpend, setExtraSpend] = useState('0')

    // Notes
    const [notesInternal, setNotesInternal] = useState('')
    const [notesGuest, setNotesGuest] = useState('')

    // Birth date
    const [birthDate, setBirthDate] = useState('')

    // Payment events
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([])
    const [newPaymentAmount, setNewPaymentAmount] = useState('')
    const [newPaymentMethod, setNewPaymentMethod] = useState('Pix')
    const [newPaymentNote, setNewPaymentNote] = useState('')
    const [showAddPayment, setShowAddPayment] = useState(false)

    // State
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState('')

    // Prefill from item
    useEffect(() => {
        if (item && open) {
            setGuestName(item.guestName || '')
            setPhone(item.phone || '')
            setEmail(item.email || '')
            setCheckIn(item.checkIn || '')
            setCheckOut(item.checkOut || '')
            setPartySize(String(item.partySize || 2))
            setRooms(String(item.rooms ?? 1))
            setNightlyRate(String(item.nightlyRate || 250))
            setBreakfastIncluded(item.breakfastIncluded || false)
            setBreakfastRate(String(item.breakfastPerPersonPerNight ?? 0))
            setManualLodging(item.manualLodgingEnabled || false)
            setManualTotal(item.manualLodgingTotal ? String(item.manualLodgingTotal) : '')
            setExtraSpend(String(item.extraSpend || 0))
            setNotesInternal(item.notesInternal || '')
            setNotesGuest(item.notesGuest || '')
            setBirthDate(formatBirthForDisplay(item.birthDate))
            setPaymentEvents(item.payment?.events || [])
            setError('')
            setSyncing(false)
            setShowAddPayment(false)
            setNewPaymentAmount('')
            setNewPaymentNote('')
        }
    }, [item, open])

    // Calculate preview
    const nights = (() => {
        if (!checkIn || !checkOut) return 0
        const d1 = new Date(checkIn)
        const d2 = new Date(checkOut)
        return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
    })()

    const party = parseInt(partySize) || 1
    const roomCount = Math.min(4, Math.max(1, parseInt(rooms) || 1))
    const rate = parseFloat(nightlyRate) || 0
    const bRate = parseFloat(breakfastRate) || 0
    const mTotal = parseFloat(manualTotal) || 0
    const extra = parseFloat(extraSpend) || 0

    const lodgingPreview = manualLodging && mTotal > 0 ? mTotal : nights * rate * party
    const breakfastPreview = breakfastIncluded ? nights * party * bRate : 0
    const totalPreview = lodgingPreview + breakfastPreview + extra

    const totalPaid = paymentEvents.reduce((sum, e) => sum + (e.amount || 0), 0)
    const balance = totalPreview - totalPaid

    async function handleAddPayment() {
        if (!item) return
        const amount = parseFloat(newPaymentAmount)
        if (!amount || amount <= 0) {
            setError('Valor do pagamento inválido')
            return
        }

        setSaving(true)
        try {
            const updated = await addPaymentEvent(item.id, {
                amount,
                date: new Date().toISOString().slice(0, 10),
                method: newPaymentMethod,
                note: newPaymentNote.trim() || undefined,
            })
            setPaymentEvents(updated.payment?.events || [])
            setNewPaymentAmount('')
            setNewPaymentNote('')
            setShowAddPayment(false)
            setError('')
        } catch (err: any) {
            setError(err.message || 'Erro ao adicionar pagamento')
        } finally {
            setSaving(false)
        }
    }

    async function handleRemovePayment(eventId: string) {
        if (!item) return
        if (!confirm('Remover este pagamento?')) return

        setSaving(true)
        try {
            const updated = await removePaymentEvent(item.id, eventId)
            setPaymentEvents(updated.payment?.events || [])
        } catch (err: any) {
            setError(err.message || 'Erro ao remover pagamento')
        } finally {
            setSaving(false)
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!item) return

        // Validate
        if (!guestName.trim()) {
            setError('Nome é obrigatório')
            return
        }
        if (!checkIn || !checkOut || checkOut <= checkIn) {
            setError('Datas inválidas')
            return
        }

        setSaving(true)
        try {
            await updateV2Record(item.id, {
                ...item,
                guestName: guestName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                checkIn,
                checkOut,
                partySize: party,
                rooms: roomCount,
                nightlyRate: rate,
                breakfastIncluded,
                breakfastPerPersonPerNight: bRate,
                manualLodgingEnabled: manualLodging,
                manualLodgingTotal: manualLodging ? mTotal : undefined,
                extraSpend: extra,
                totalNights: nights,
                totalPrice: totalPreview,
                notesInternal: notesInternal.trim() || undefined,
                notesGuest: notesGuest.trim() || undefined,
                birthDate: birthDate.trim() || undefined,
                // Preserve payment events - this is critical!
                payment: {
                    ...item.payment,
                    events: paymentEvents,
                    deposit: totalPaid > 0 ? { paid: true, due: totalPaid } : item.payment?.deposit,
                },
            })

            // Show syncing state while waiting for refresh
            setSaving(false)
            setSyncing(true)
            await onSaved()

            onClose()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar')
            setSaving(false)
        } finally {
            setSyncing(false)
        }
    }

    const BRL = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

    // formatBirthInput is now imported from @/lib/birthdate

    return (
        <BottomSheet open={open} onClose={onClose} title="Editar Reserva">
            <form onSubmit={handleSave} className="space-y-4">
                {/* Guest Info */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        Nome do hóspede *
                    </label>
                    <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Birth Date */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        Data de nascimento
                    </label>
                    <input
                        type="text"
                        value={birthDate}
                        onChange={(e) => setBirthDate(formatBirthInput(e.target.value))}
                        placeholder="DD/MM/AAAA"
                        inputMode="numeric"
                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Check-in *
                        </label>
                        <input
                            type="date"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Check-out *
                        </label>
                        <input
                            type="date"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                {/* Party Size, Rooms & Rate */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Pessoas
                        </label>
                        <input
                            type="number"
                            value={partySize}
                            onChange={(e) => setPartySize(e.target.value)}
                            min="1"
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Quartos
                        </label>
                        <select
                            value={rooms}
                            onChange={(e) => setRooms(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {ROOMS_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Diária
                        </label>
                        <input
                            type="number"
                            value={nightlyRate}
                            onChange={(e) => setNightlyRate(e.target.value)}
                            min="0"
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={manualLodging}
                        />
                    </div>
                </div>

                {/* Manual Lodging */}
                <ToggleSwitch
                    id="manualLodgingEdit"
                    checked={manualLodging}
                    onChange={setManualLodging}
                    label="Valor manual de hospedagem"
                />
                {manualLodging && (
                    <input
                        type="number"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        min="0"
                        placeholder="Total hospedagem"
                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                )}

                {/* Breakfast */}
                <ToggleSwitch
                    id="breakfastEdit"
                    checked={breakfastIncluded}
                    onChange={setBreakfastIncluded}
                    label="Inclui café da manhã"
                />
                {breakfastIncluded && (
                    <input
                        type="number"
                        value={breakfastRate}
                        onChange={(e) => setBreakfastRate(e.target.value)}
                        min="0"
                        placeholder="Café por pessoa/noite (R$)"
                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                )}

                {/* Extra Spend */}
                <div>
                    <label className="block text-sm font-medium eco-text mb-1">
                        Gastos extras (R$)
                    </label>
                    <input
                        type="number"
                        value={extraSpend}
                        onChange={(e) => setExtraSpend(e.target.value)}
                        min="0"
                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Price Preview */}
                <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Hospedagem</span>
                        <span>{BRL(lodgingPreview)}</span>
                    </div>
                    {breakfastIncluded && (
                        <div className="flex justify-between text-sm">
                            <span>Café</span>
                            <span>{BRL(breakfastPreview)}</span>
                        </div>
                    )}
                    {extra > 0 && (
                        <div className="flex justify-between text-sm">
                            <span>Extras</span>
                            <span>{BRL(extra)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                        <span>Total</span>
                        <span>{BRL(totalPreview)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-700">
                        <span>Pago</span>
                        <span>{BRL(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span>Saldo</span>
                        <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {BRL(balance)}
                        </span>
                    </div>
                </div>

                {/* Payment Events */}
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">Pagamentos</h3>
                        <button
                            type="button"
                            onClick={() => setShowAddPayment(!showAddPayment)}
                            className="text-blue-600 text-sm flex items-center gap-1"
                        >
                            <Plus size={16} /> Adicionar
                        </button>
                    </div>

                    {showAddPayment && (
                        <div className="bg-[var(--eco-surface-alt)] rounded-lg p-3 mb-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    value={newPaymentAmount}
                                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                                    placeholder="Valor"
                                    className="px-3 py-2 border border-[var(--eco-border)] rounded-lg"
                                />
                                <select
                                    value={newPaymentMethod}
                                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                                    className="px-3 py-2 border border-[var(--eco-border)] rounded-lg"
                                >
                                    {PAYMENT_METHODS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                value={newPaymentNote}
                                onChange={(e) => setNewPaymentNote(e.target.value)}
                                placeholder="Nota (opcional)"
                                className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={handleAddPayment}
                                disabled={saving}
                                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                Adicionar Pagamento
                            </button>
                        </div>
                    )}

                    {paymentEvents.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum pagamento registrado</p>
                    ) : (
                        <div className="space-y-2">
                            {paymentEvents.map((event: any, i) => (
                                <div key={event.id || i} className="flex items-center justify-between bg-s2 p-2 rounded-lg border border-app">
                                    <div>
                                        <div className="font-medium">{BRL(event.amount)}</div>
                                        <div className="text-xs text-gray-500">
                                            {event.date} • {event.method || 'Pix'}
                                            {event.note && ` • ${event.note}`}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePayment(event.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="border-t pt-4 space-y-3">
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Notas internas
                        </label>
                        <textarea
                            value={notesInternal}
                            onChange={(e) => setNotesInternal(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium eco-text mb-1">
                            Notas para o hóspede
                        </label>
                        <textarea
                            value={notesGuest}
                            onChange={(e) => setNotesGuest(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="flex-1 px-4 py-2 border border-[var(--eco-border)] rounded-lg eco-text hover:bg-[var(--eco-surface-alt)]"
                        disabled={saving || syncing}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        disabled={saving || syncing}
                    >
                        {saving ? 'Salvando...' : syncing ? 'Sincronizando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </BottomSheet>
    )
}
