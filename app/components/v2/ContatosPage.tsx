'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Clock, Search, X, Phone, Mail, Calendar, Users, Plus } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'
import { deriveContacts, searchContacts, type Contact } from '@/lib/contacts'
import { useIsMobile } from '@/app/hooks/useIsMobile'
import PageHeader from '@/app/components/ui/PageHeader'

interface ContatosPageProps {
    records: ReservationV2[]
    loading: boolean
    onViewContact: (contact: Contact, reservations: ReservationV2[]) => void
    onViewReservation?: (r: ReservationV2) => void
    onCreateReservation?: (contact: Contact) => void
    onCreateLead?: (contact: Contact) => void
}

function formatBR(iso: string) {
    const [y, m, day] = iso.split('-')
    return `${day}/${m}/${y}`
}

function formatMoney(n: number | undefined) {
    if (n == null) return '—'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function ContatosPage({
    records,
    loading,
    onViewContact,
    onViewReservation,
    onCreateReservation,
    onCreateLead,
}: ContatosPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const isMobile = useIsMobile()

    // Derive contacts from records
    const allContacts = useMemo(() => deriveContacts(records), [records])

    // Filter contacts by search query
    const contacts = useMemo(() => {
        return searchContacts(allContacts, searchQuery)
    }, [allContacts, searchQuery])

    // Get selected contact and their reservations
    const selectedContact = contacts.find(c => c.id === selectedId) || null
    const selectedReservations = useMemo(() => {
        if (!selectedContact) return []
        return records
            .filter(r => selectedContact.reservationIds.includes(r.id))
            .sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''))
    }, [selectedContact, records])

    function handleContactClick(contact: Contact) {
        const reservations = records.filter((r) =>
            contact.reservationIds.includes(r.id)
        )
        if (isMobile) {
            // Mobile: use bottom sheet via parent
            onViewContact(contact, reservations)
        } else {
            // Desktop: show in right panel
            setSelectedId(contact.id)
        }
    }

    return (
        <div className="pb-20">
            {/* Desktop: 2-column layout */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-6">
                {/* Left: Search + List */}
                <div className="lg:col-span-5">
                    <section className="card">
                        <PageHeader title="Contatos" subtitle={`${allContacts.length} contatos`} />

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 eco-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nome, telefone ou email"
                                className="input-eco pl-10 pr-10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 eco-muted hover:eco-text transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Results count when searching */}
                        {searchQuery && (
                            <div className="text-xs eco-muted mb-2">
                                {contacts.length} resultado{contacts.length !== 1 ? 's' : ''}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-sm eco-muted">Carregando...</div>
                        ) : contacts.length === 0 ? (
                            <p className="text-sm eco-muted">
                                {searchQuery ? 'Nenhum contato encontrado.' : 'Nenhum contato.'}
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {contacts.map((contact) => (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleContactClick(contact)}
                                        className={`mini-card w-full flex items-center justify-between text-left ${selectedId === contact.id ? 'border-2 border-[var(--eco-warning)] bg-[var(--eco-surface-alt)]' : ''
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium eco-text flex items-center gap-2">
                                                {contact.name}
                                                {contact.hasWaiting && (
                                                    <span className="chip-warn">
                                                        <Clock size={12} />
                                                        Em espera
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs eco-muted">
                                                {contact.phone || contact.email || '—'}
                                            </div>
                                            <div className="text-xs eco-muted opacity-75">
                                                {contact.totalBookings} reserva{contact.totalBookings !== 1 ? 's' : ''} • Última: {formatBR(contact.lastStayDate)}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="eco-muted" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right: Detail Panel (desktop only) */}
                <div className="hidden lg:block lg:col-span-7">
                    <section className="card sticky top-20">
                        {selectedContact ? (
                            <ContactDetailPanel
                                contact={selectedContact}
                                reservations={selectedReservations}
                                onViewReservation={onViewReservation}
                                onCreateReservation={onCreateReservation}
                                onCreateLead={onCreateLead}
                                onClose={() => setSelectedId(null)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 eco-muted">
                                <Users size={48} className="mb-3 opacity-50" />
                                <p className="text-sm">Selecione um contato</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}

// --- Inline Detail Panel for Desktop ---
interface ContactDetailPanelProps {
    contact: Contact
    reservations: ReservationV2[]
    onViewReservation?: (r: ReservationV2) => void
    onCreateReservation?: (contact: Contact) => void
    onCreateLead?: (contact: Contact) => void
    onClose: () => void
}

function ContactDetailPanel({
    contact,
    reservations,
    onViewReservation,
    onCreateReservation,
    onCreateLead,
    onClose,
}: ContactDetailPanelProps) {
    const stats = useMemo(() => {
        const confirmed = reservations.filter(r => r.status === 'confirmed' || !r.status).length
        const waiting = reservations.filter(r => r.status === 'waiting').length
        const rejected = reservations.filter(r => r.status === 'rejected').length
        return { confirmed, waiting, rejected }
    }, [reservations])

    return (
        <div>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold eco-text">{contact.name}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm eco-muted">
                        {contact.phone && (
                            <div className="flex items-center gap-1">
                                <Phone size={14} /> {contact.phone}
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex items-center gap-1">
                                <Mail size={14} /> {contact.email}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:eco-surface-alt transition-colors"
                >
                    <X size={20} className="eco-muted" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="mini-card text-center">
                    <div className="text-2xl font-bold text-[var(--eco-success)]">{stats.confirmed}</div>
                    <div className="text-xs eco-muted">Confirmadas</div>
                </div>
                <div className="mini-card text-center">
                    <div className="text-2xl font-bold text-[var(--eco-warning)]">{stats.waiting}</div>
                    <div className="text-xs eco-muted">Em espera</div>
                </div>
                <div className="mini-card text-center">
                    <div className="text-2xl font-bold text-[var(--eco-danger)]">{stats.rejected}</div>
                    <div className="text-xs eco-muted">Rejeitadas</div>
                </div>
            </div>

            {/* Actions */}
            {(onCreateReservation || onCreateLead) && (
                <div className="flex gap-2 mb-4">
                    {onCreateReservation && (
                        <button
                            onClick={() => onCreateReservation(contact)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg eco-surface-alt border border-[var(--eco-border)] hover:bg-[var(--eco-surface)] transition-colors"
                        >
                            <Plus size={16} />
                            Nova Reserva
                        </button>
                    )}
                    {onCreateLead && (
                        <button
                            onClick={() => onCreateLead(contact)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg eco-surface-alt border border-[var(--eco-border)] hover:bg-[var(--eco-surface)] transition-colors"
                        >
                            <Calendar size={16} />
                            Novo Lead
                        </button>
                    )}
                </div>
            )}

            {/* Reservations */}
            <h3 className="text-sm font-medium eco-muted mb-2">Histórico de reservas</h3>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {reservations.map(r => (
                    <button
                        key={r.id}
                        onClick={() => onViewReservation?.(r)}
                        className="mini-card w-full text-left"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm eco-text">
                                    {formatBR(r.checkIn)} → {formatBR(r.checkOut)}
                                </div>
                                <div className="text-xs eco-muted flex items-center gap-2">
                                    <span>{r.partySize} pessoas</span>
                                    <span>{formatMoney(r.totalPrice)}</span>
                                </div>
                            </div>
                            {r.status === 'waiting' && (
                                <span className="chip-warn text-xs">Em espera</span>
                            )}
                            {r.status === 'rejected' && (
                                <span className="chip-danger text-xs">Rejeitada</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
