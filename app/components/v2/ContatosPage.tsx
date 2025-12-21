'use client'

import { useMemo } from 'react'
import { ChevronRight, Clock } from 'lucide-react'
import type { ReservationV2 } from '@/core/entities_v2'
import { deriveContacts, type Contact } from '@/lib/contacts'

interface ContatosPageProps {
    records: ReservationV2[]  // Passed from parent
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
    // Derive contacts from records (no fetch!)
    const contacts = useMemo(() => deriveContacts(records), [records])

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

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : contacts.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum contato encontrado.</p>
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
