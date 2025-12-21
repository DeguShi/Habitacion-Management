'use client'

import { useState, useCallback } from 'react'
import BottomNav, { type TabId } from '@/app/components/v2/BottomNav'
import ConfirmadasPage from '@/app/components/v2/ConfirmadasPage'
import EmEsperaPage from '@/app/components/v2/EmEsperaPage'
import ContatosPage from '@/app/components/v2/ContatosPage'
import FerramentasPage from '@/app/components/v2/FerramentasPage'
import type { ReservationV2 } from '@/core/entities_v2'
import type { Contact } from '@/lib/contacts'
import { confirmRecord } from '@/lib/data/v2'

interface ClientShellV2Props {
    canWrite?: boolean
}

export default function ClientShellV2({ canWrite = false }: ClientShellV2Props) {
    const [activeTab, setActiveTab] = useState<TabId>('confirmadas')
    const [refreshKey, setRefreshKey] = useState(0)

    // Modal states
    const [confirmingItem, setConfirmingItem] = useState<ReservationV2 | null>(null)
    const [viewingContact, setViewingContact] = useState<{
        contact: Contact
        reservations: ReservationV2[]
    } | null>(null)

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1)
    }, [])

    // Placeholder handlers - these will be implemented with proper modals later
    function handleViewReservation(r: ReservationV2) {
        // For now, just log - full modal implementation later
        console.log('View reservation:', r.id)
        alert(`Reserva: ${r.guestName}\nCheck-in: ${r.checkIn}\nCheck-out: ${r.checkOut}`)
    }

    function handleEditReservation(r: ReservationV2) {
        console.log('Edit reservation:', r.id)
        alert('Editor em desenvolvimento')
    }

    function handleDeleteReservation(r: ReservationV2) {
        if (!canWrite) return
        const ok = confirm(`Excluir reserva de ${r.guestName}?`)
        if (!ok) return
        // For now, just refresh - full delete implementation needed
        console.log('Delete reservation:', r.id)
    }

    function handleCreateReservation(date: string) {
        if (!canWrite) return
        console.log('Create reservation for:', date)
        alert('Criação em desenvolvimento')
    }

    async function handleConfirmWithDetails(r: ReservationV2) {
        setConfirmingItem(r)
        // For now, quick confirm without sheet
        try {
            await confirmRecord(r.id)
            refresh()
            setConfirmingItem(null)
        } catch (e) {
            console.error('Failed to confirm:', e)
            alert('Erro ao confirmar')
        }
    }

    function handleViewContact(contact: Contact, reservations: ReservationV2[]) {
        setViewingContact({ contact, reservations })
        // For now, just show alert - proper modal later
        alert(
            `Contato: ${contact.name}\nBookings: ${contact.totalBookings}\nReservas: ${reservations.map((r) => r.checkIn).join(', ')}`
        )
        setViewingContact(null)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-lg mx-auto px-4 py-4">
                {activeTab === 'confirmadas' && (
                    <ConfirmadasPage
                        canWrite={canWrite}
                        onViewReservation={handleViewReservation}
                        onEditReservation={handleEditReservation}
                        onDeleteReservation={handleDeleteReservation}
                        onCreateReservation={handleCreateReservation}
                        refreshKey={refreshKey}
                    />
                )}

                {activeTab === 'em-espera' && (
                    <EmEsperaPage
                        canWrite={canWrite}
                        onConfirmWithDetails={handleConfirmWithDetails}
                        refreshKey={refreshKey}
                        onRefresh={refresh}
                    />
                )}

                {activeTab === 'contatos' && (
                    <ContatosPage
                        onViewContact={handleViewContact}
                        refreshKey={refreshKey}
                    />
                )}

                {activeTab === 'ferramentas' && (
                    <FerramentasPage canWrite={canWrite} />
                )}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    )
}
