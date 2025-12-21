'use client'

import { useMemo } from 'react'
import { Phone, Mail, Calendar, Users, Plus, Clock, XCircle, CheckCircle } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { Contact } from '@/lib/contacts'
import type { ReservationV2 } from '@/core/entities_v2'

interface ContactDetailSheetProps {
    open: boolean
    onClose: () => void
    contact: Contact | null
    reservations: ReservationV2[]
    onViewReservation: (r: ReservationV2) => void
    onCreateReservation: (contact: Contact) => void
    onCreateLead: (contact: Contact) => void
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

export default function ContactDetailSheet({
    open,
    onClose,
    contact,
    reservations,
    onViewReservation,
    onCreateReservation,
    onCreateLead,
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

    function getStatusPill(status?: string) {
        switch (status) {
            case 'waiting':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        <Clock size={12} /> Espera
                    </span>
                )
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                        <XCircle size={12} /> Cancelada
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
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
                    <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>

                    <div className="mt-2 space-y-1">
                        {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone size={14} />
                                <a href={`tel:${contact.phone}`} className="hover:text-blue-600">
                                    {contact.phone}
                                </a>
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail size={14} />
                                <a href={`mailto:${contact.email}`} className="hover:text-blue-600">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {contact.hasWaiting && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                <Clock size={12} /> Em espera
                            </span>
                        )}
                        {contact.hasRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                                <XCircle size={12} /> Cancelada(s)
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">{contact.totalBookings}</div>
                        <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
                        <div className="text-xs text-green-600">Confirmadas</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-700">{stats.waiting}</div>
                        <div className="text-xs text-yellow-600">Em espera</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => onCreateReservation(contact)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                        <Plus size={18} />
                        Nova reserva
                    </button>
                    <button
                        onClick={() => onCreateLead(contact)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus size={18} />
                        Novo pedido
                    </button>
                </div>

                {/* Reservation History */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Histórico</h4>

                    {sortedReservations.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma reserva.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sortedReservations.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => onViewReservation(r)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-left"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusPill(r.status)}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
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
                                            <div className="text-sm font-medium text-green-700 mt-1">
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
