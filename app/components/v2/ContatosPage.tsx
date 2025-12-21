'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Clock, Search, X } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'
import { deriveContacts, searchContacts, type Contact } from '@/lib/contacts'

interface ContatosPageProps {
    records: ReservationV2[]
    loading: boolean
    onViewContact: (contact: Contact, reservations: ReservationV2[]) => void
}

function formatBR(iso: string) {
    const [y, m, day] = iso.split('-')
    return `${day}/${m}/${y}`
}

export default function ContatosPage({
    records,
    loading,
    onViewContact,
}: ContatosPageProps) {
    const [searchQuery, setSearchQuery] = useState('')

    // Derive contacts from records
    const allContacts = useMemo(() => deriveContacts(records), [records])

    // Filter contacts by search query
    const contacts = useMemo(() => {
        return searchContacts(allContacts, searchQuery)
    }, [allContacts, searchQuery])

    function handleContactClick(contact: Contact) {
        const reservations = records.filter((r) =>
            contact.reservationIds.includes(r.id)
        )
        onViewContact(contact, reservations)
    }

    return (
        <div className="pb-20">
            <section className="card">
                <h2 className="text-lg font-semibold mb-3">Contatos</h2>

                {/* Search Input */}
                <div className="relative mb-4">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, telefone ou email"
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Results count when searching */}
                {searchQuery && (
                    <div className="text-xs text-gray-500 mb-2">
                        {contacts.length} resultado{contacts.length !== 1 ? 's' : ''}
                    </div>
                )}

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : contacts.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        {searchQuery ? 'Nenhum contato encontrado.' : 'Nenhum contato.'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {contacts.map((contact) => (
                            <button
                                key={contact.id}
                                onClick={() => handleContactClick(contact)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white shadow-sm text-left hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        {contact.name}
                                        {contact.hasWaiting && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                                <Clock size={12} />
                                                Em espera
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {contact.phone || contact.email || '—'}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {contact.totalBookings} reserva{contact.totalBookings !== 1 ? 's' : ''} • Última: {formatBR(contact.lastStayDate)}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-400" />
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
