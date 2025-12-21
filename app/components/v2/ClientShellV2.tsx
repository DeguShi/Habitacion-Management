'use client'

import { useState, useCallback } from 'react'
import BottomNav, { type TabId } from '@/app/components/v2/BottomNav'
import ConfirmadasPage from '@/app/components/v2/ConfirmadasPage'
import EmEsperaPage from '@/app/components/v2/EmEsperaPage'
import ContatosPage from '@/app/components/v2/ContatosPage'
import FerramentasPage from '@/app/components/v2/FerramentasPage'
import CreateLeadSheet from '@/app/components/v2/CreateLeadSheet'
import CreateActionSheet from '@/app/components/v2/CreateActionSheet'
import ConfirmSheet from '@/app/components/v2/ConfirmSheet'
import EditReservationSheet from '@/app/components/v2/EditReservationSheet'
import type { ReservationV2 } from '@/core/entities_v2'
import type { Contact } from '@/lib/contacts'
import { deleteV2Record } from '@/lib/data/v2'

interface ClientShellV2Props {
    canWrite?: boolean
}

export default function ClientShellV2({ canWrite = false }: ClientShellV2Props) {
    const [activeTab, setActiveTab] = useState<TabId>('confirmadas')
    const [refreshKey, setRefreshKey] = useState(0)

    // Sheet states
    const [actionSheetOpen, setActionSheetOpen] = useState(false)
    const [createLeadOpen, setCreateLeadOpen] = useState(false)
    const [createConfirmedOpen, setCreateConfirmedOpen] = useState(false)
    const [confirmingItem, setConfirmingItem] = useState<ReservationV2 | null>(null)
    const [editingItem, setEditingItem] = useState<ReservationV2 | null>(null)

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1)
    }, [])

    // View reservation details
    function handleViewReservation(r: ReservationV2) {
        // Simple alert for now - could open a ViewSheet later
        const info = [
            `Hóspede: ${r.guestName}`,
            `Pessoas: ${r.partySize}`,
            `Check-in: ${r.checkIn}`,
            `Check-out: ${r.checkOut}`,
            `Total: R$ ${r.totalPrice}`,
            r.phone ? `Tel: ${r.phone}` : '',
            r.email ? `Email: ${r.email}` : '',
        ].filter(Boolean).join('\n')
        alert(info)
    }

    // Edit reservation
    function handleEditReservation(r: ReservationV2) {
        if (!canWrite) return
        setEditingItem(r)
    }

    // Delete reservation
    async function handleDeleteReservation(r: ReservationV2) {
        if (!canWrite) return
        const ok = confirm(`Excluir reserva de ${r.guestName}?`)
        if (!ok) return
        try {
            await deleteV2Record(r.id)
            refresh()
        } catch (e) {
            console.error('Delete failed:', e)
            alert('Erro ao excluir')
        }
    }

    // Create reservation for specific date
    function handleCreateReservation(date: string) {
        if (!canWrite) return
        // Open action sheet to choose lead vs confirmed
        setActionSheetOpen(true)
    }

    // Confirm waiting item
    function handleConfirmWithDetails(r: ReservationV2) {
        if (!canWrite) return
        setConfirmingItem(r)
    }

    // View contact
    function handleViewContact(contact: Contact, reservations: ReservationV2[]) {
        // Simple alert for now
        const info = [
            `Contato: ${contact.name}`,
            contact.phone ? `Tel: ${contact.phone}` : '',
            contact.email ? `Email: ${contact.email}` : '',
            `Reservas: ${contact.totalBookings}`,
            `Última: ${contact.lastStayDate}`,
        ].filter(Boolean).join('\n')
        alert(info)
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

            <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onCreateClick={canWrite ? () => setActionSheetOpen(true) : undefined}
            />

            {/* Sheets */}
            <CreateActionSheet
                open={actionSheetOpen}
                onClose={() => setActionSheetOpen(false)}
                onCreateLead={() => setCreateLeadOpen(true)}
                onCreateConfirmed={() => setCreateConfirmedOpen(true)}
            />

            <CreateLeadSheet
                open={createLeadOpen}
                onClose={() => setCreateLeadOpen(false)}
                onCreated={() => {
                    refresh()
                    setActiveTab('em-espera')
                }}
            />

            <ConfirmSheet
                open={createConfirmedOpen || !!confirmingItem}
                onClose={() => {
                    setCreateConfirmedOpen(false)
                    setConfirmingItem(null)
                }}
                onConfirmed={() => {
                    refresh()
                    setActiveTab('confirmadas')
                }}
                item={confirmingItem}
            />

            <EditReservationSheet
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSaved={refresh}
                item={editingItem}
            />
        </div>
    )
}

