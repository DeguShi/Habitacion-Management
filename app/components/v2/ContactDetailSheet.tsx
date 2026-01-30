'use client'

import { useMemo, useState } from 'react'
import { Phone, Mail, Calendar, Users, Plus, Clock, XCircle, CheckCircle, Cake, MessageCircle, Pencil, ChevronDown, FileText } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { Contact } from '@/lib/contacts'
import type { ReservationV2 } from '@/core/entities_v2'
import { formatBirthForDisplay } from '@/lib/birthdate'

interface ContactDetailSheetProps {
    open: boolean
    onClose: () => void
    contact: Contact | null
    reservations: ReservationV2[]
    onViewReservation: (r: ReservationV2) => void
    onCreateReservation: (contact: Contact) => void
    onCreateLead: (contact: Contact) => void
    onEditContact?: (contact: Contact) => void
    onUpdateGuestPreferences?: (contact: Contact, preferences: string) => Promise<void>
}

function formatBR(iso: string) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}



function formatMoney(n: number | undefined) {
    if (n == null) return '—'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

/**
 * Checks if a phone number is clean enough for WhatsApp link.
 * Must be 10-13 digits (Brazilian patterns).
 */
function isCleanPhoneForWhatsApp(phone: string | undefined): boolean {
    if (!phone) return false
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 13
}

/**
 * Builds WhatsApp link for a phone number.
 * Uses number as-is if it already has country code (12+ digits).
 * Adds +54 Argentina country code if not present (most clients are Argentine).
 */
function buildWhatsAppLink(phone: string): string {
    let digits = phone.replace(/\D/g, '')
    // If 10-11 digits, assume Argentine number without country code
    if (digits.length <= 11) {
        digits = '54' + digits
    }
    return `https://wa.me/${digits}`
}

export default function ContactDetailSheet({
    open,
    onClose,
    contact,
    reservations,
    onViewReservation,
    onCreateReservation,
    onCreateLead,
    onEditContact,
    onUpdateGuestPreferences,
}: ContactDetailSheetProps) {
    if (!contact) return null

    // Calculate stats
    const stats = useMemo(() => {
        const confirmed = reservations.filter(r => r.status === 'confirmed' || !r.status).length
        const waiting = reservations.filter(r => r.status === 'waiting').length
        const rejected = reservations.filter(r => r.status === 'rejected').length
        return { confirmed, waiting, rejected }
    }, [reservations])

    // Sort reservations by checkIn (newest first)
    const sortedReservations = useMemo(() => {
        return [...reservations].sort((a, b) =>
            (b.checkIn || '').localeCompare(a.checkIn || '')
        )
    }, [reservations])

    // Get best guest preferences from reservations
    const guestPreferences = useMemo(() => {
        // Find the most recent reservation with guest preferences
        const sorted = [...reservations].sort((a, b) =>
            (b.checkIn || '').localeCompare(a.checkIn || '')
        )
        for (const r of sorted) {
            if (r.guestPreferences?.trim()) {
                return r.guestPreferences.trim()
            }
        }
        return null
    }, [reservations])

    // State for preferences editing
    const [showPreferences, setShowPreferences] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedPreferences, setEditedPreferences] = useState('')
    const [saving, setSaving] = useState(false)

    function getStatusPill(status?: string) {
        switch (status) {
            case 'waiting':
                return (
                    <span className="chip-warn">
                        <Clock size={12} /> Espera
                    </span>
                )
            case 'rejected':
                return (
                    <span className="chip-danger">
                        <XCircle size={12} /> Cancelada
                    </span>
                )
            default:
                return (
                    <span className="chip-success">
                        <CheckCircle size={12} /> Confirmada
                    </span>
                )
        }
    }

    return (
        <BottomSheet open={open} onClose={onClose} title="Detalhes do Contato">
            <div className="space-y-5">
                {/* Header / Contact Info */}
                <div>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-app">{contact.name}</h3>
                        {onEditContact && (
                            <button
                                onClick={() => onEditContact(contact)}
                                className="p-2 rounded-lg hover:bg-[var(--eco-surface-alt)] transition-colors"
                                aria-label="Editar contato"
                                title="Editar contato"
                            >
                                <Pencil size={18} className="text-[var(--eco-primary)]" />
                            </button>
                        )}
                    </div>

                    <div className="mt-2 space-y-1">
                        {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Phone size={14} />
                                <a href={`tel:${contact.phone}`} className="hover:text-primary">
                                    {contact.phone}
                                </a>
                                {isCleanPhoneForWhatsApp(contact.phone) && (
                                    <a
                                        href={buildWhatsAppLink(contact.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                                        aria-label="Enviar WhatsApp"
                                    >
                                        <MessageCircle size={16} />
                                    </a>
                                )}
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Mail size={14} />
                                <a href={`mailto:${contact.email}`} className="hover:text-primary">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                        {contact.birthDate && (
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <Cake size={14} />
                                <span>Aniversário: {formatBirthForDisplay(contact.birthDate)}</span>
                            </div>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {contact.hasWaiting && (
                            <span className="chip-warn">
                                <Clock size={12} /> Em espera
                            </span>
                        )}
                        {contact.hasRejected && (
                            <span className="chip-danger">
                                <XCircle size={12} /> Cancelada(s)
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-s2 rounded-lg">
                        <div className="text-2xl font-bold text-app">{contact.totalBookings}</div>
                        <div className="text-xs text-muted">Total</div>
                    </div>
                    <div className="text-center p-3 panel-success rounded-lg">
                        <div className="text-2xl font-bold">{stats.confirmed}</div>
                        <div className="text-xs opacity-80">Confirmadas</div>
                    </div>
                    <div className="text-center p-3 panel-warn rounded-lg">
                        <div className="text-2xl font-bold">{stats.waiting}</div>
                        <div className="text-xs opacity-80">Em espera</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => onCreateReservation(contact)}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Nova reserva
                    </button>
                    <button
                        onClick={() => onCreateLead(contact)}
                        className="btn flex-1 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Novo pedido
                    </button>
                </div>

                {/* Guest Preferences (collapsible + editable) */}
                <div className="border-t border-[var(--eco-border)] pt-3">
                    <button
                        onClick={() => {
                            setShowPreferences(!showPreferences)
                            if (!showPreferences) {
                                setEditedPreferences(guestPreferences || '')
                                setIsEditing(false)
                            }
                        }}
                        className="w-full flex items-center justify-between text-sm font-semibold text-muted hover:text-app transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <FileText size={14} />
                            Preferências do Hóspede
                            {!guestPreferences && <span className="text-xs text-muted">(vazio)</span>}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform ${showPreferences ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {showPreferences && (
                        <div className="mt-2 space-y-2">
                            {isEditing ? (
                                <>
                                    <textarea
                                        value={editedPreferences}
                                        onChange={(e) => setEditedPreferences(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-[var(--eco-border)] rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Preferências do cliente (dieta, quartos, etc.)"
                                        disabled={saving}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 px-3 py-1.5 text-sm border border-[var(--eco-border)] rounded-lg"
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!contact || !onUpdateGuestPreferences) return
                                                setSaving(true)
                                                try {
                                                    await onUpdateGuestPreferences(contact, editedPreferences.trim())
                                                    setIsEditing(false)
                                                } finally {
                                                    setSaving(false)
                                                }
                                            }}
                                            className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
                                            disabled={saving}
                                        >
                                            {saving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    onClick={() => {
                                        if (onUpdateGuestPreferences) {
                                            setEditedPreferences(guestPreferences || '')
                                            setIsEditing(true)
                                        }
                                    }}
                                    className={`p-3 bg-s2 rounded-lg text-sm text-app whitespace-pre-wrap ${onUpdateGuestPreferences ? 'cursor-pointer hover:bg-s3' : ''}`}
                                >
                                    {guestPreferences || <span className="text-muted italic">Nenhuma preferência registrada. Clique para adicionar.</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Reservation History */}
                <div>
                    <h4 className="text-sm font-semibold text-muted mb-2">Histórico</h4>

                    {sortedReservations.length === 0 ? (
                        <p className="text-sm text-muted">Nenhuma reserva.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sortedReservations.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => onViewReservation(r)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-s2 hover:bg-s3 text-left"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusPill(r.status)}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {r.rooms ?? 1} quarto{(r.rooms ?? 1) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {r.totalPrice != null && (
                                            <div className="text-sm font-medium text-success mt-1">
                                                {formatMoney(r.totalPrice)}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </BottomSheet>
    )
}
