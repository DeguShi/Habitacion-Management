'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import BottomNav, { type TabId } from '@/app/components/v2/BottomNav'
import ConfirmadasPage from '@/app/components/v2/ConfirmadasPage'
import EmEsperaPage from '@/app/components/v2/EmEsperaPage'
import ContatosPage from '@/app/components/v2/ContatosPage'
import FerramentasPage from '@/app/components/v2/FerramentasPage'
import FinalizadasPage from '@/app/components/v2/FinalizadasPage'
import CreateLeadSheet from '@/app/components/v2/CreateLeadSheet'
import CreateActionSheet from '@/app/components/v2/CreateActionSheet'
import ConfirmSheet from '@/app/components/v2/ConfirmSheet'
import EditReservationSheet from '@/app/components/v2/EditReservationSheet'
import ViewReservationSheet from '@/app/components/v2/ViewReservationSheet'
import ContactDetailSheet from '@/app/components/v2/ContactDetailSheet'
import FinalizeOkSheet from '@/app/components/v2/FinalizeOkSheet'
import FinalizeIssueSheet from '@/app/components/v2/FinalizeIssueSheet'
import type { ReservationV2 } from '@/core/entities_v2'
import type { Contact } from '@/lib/contacts'
import { getBestNotesForContact } from '@/lib/contacts'
import { getFinishedPending, appendInternalNote } from '@/lib/finished-utils'
import { deleteV2Record, listV2Records, updateV2Record } from '@/lib/data/v2'

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_FETCH === '1'

// ============================================================
// Module-level guard to prevent double initial fetch
// (React StrictMode remounts effects in dev, this persists)
// ============================================================
let v2InitialFetchStarted = false

function shouldStartV2InitialFetch(): boolean {
    if (v2InitialFetchStarted) {
        if (DEBUG) console.log('[fetch] Initial fetch already started, skipping (StrictMode guard)')
        return false
    }
    v2InitialFetchStarted = true
    return true
}

// Reset on hot reload in dev (optional, helps with HMR)
if (typeof window !== 'undefined' && (module as any).hot) {
    (module as any).hot.dispose(() => {
        v2InitialFetchStarted = false
    })
}

interface ClientShellV2Props {
    canWrite?: boolean
}

export default function ClientShellV2({ canWrite = false }: ClientShellV2Props) {
    const [activeTab, setActiveTab] = useState<TabId>('confirmadas')

    // ============================================================
    // Centralized Records Store
    // ============================================================
    const [records, setRecords] = useState<ReservationV2[]>([])
    const [loadingInitial, setLoadingInitial] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Dedupe guards
    const refreshingRef = useRef(false)
    const queuedRef = useRef(false)

    /**
     * Deduped refresh: only one fetch in-flight, queued requests coalesce.
     */
    const refreshRecords = useCallback(async (reason?: string) => {
        if (DEBUG) console.log('[fetch] refreshRecords called:', reason || '(no reason)')

        if (refreshingRef.current) {
            queuedRef.current = true
            if (DEBUG) console.log('[fetch] Already refreshing, queued for later')
            return
        }

        refreshingRef.current = true
        setRefreshing(true)
        setError(null)

        try {
            if (DEBUG) console.log('[fetch] Starting fetch...')
            const next = await listV2Records() // Fetch ALL, normalized
            setRecords(next)
            if (DEBUG) console.log('[fetch] Fetched', next.length, 'records')

            // Update viewingItem if it exists in the new records
            setViewingItem(prev => {
                if (!prev) return null
                const updated = next.find(r => r.id === prev.id)
                return updated || null
            })
        } catch (e: any) {
            console.error('Failed to fetch records:', e)
            setError(e?.message || 'Erro ao carregar')
        } finally {
            setRefreshing(false)
            setLoadingInitial(false)
            refreshingRef.current = false

            // If another refresh was requested while we were fetching, do it now
            if (queuedRef.current) {
                queuedRef.current = false
                if (DEBUG) console.log('[fetch] Processing queued refresh')
                void refreshRecords('queued')
            }
        }
    }, [])

    // Load once on mount (with StrictMode guard)
    useEffect(() => {
        if (!shouldStartV2InitialFetch()) return
        if (DEBUG) console.log('[fetch] Initial fetch starting')
        refreshRecords('initial')
    }, [refreshRecords])

    // ============================================================
    // Derived Data for Tabs (useMemo = no refetch on tab switch)
    // ============================================================
    const confirmedRecords = useMemo(
        () => records.filter((r) => r.status === 'confirmed' || !r.status),
        [records]
    )

    const waitingRecords = useMemo(
        () => records.filter((r) => r.status === 'waiting'),
        [records]
    )

    const rejectedRecords = useMemo(
        () => records.filter((r) => r.status === 'rejected'),
        [records]
    )

    // Phase 9.3: Finished stays pending review
    const finishedRecords = useMemo(
        () => getFinishedPending(records),
        [records]
    )

    // ============================================================
    // Sheet States
    // ============================================================
    const [actionSheetOpen, setActionSheetOpen] = useState(false)
    const [createLeadOpen, setCreateLeadOpen] = useState(false)
    const [createConfirmedOpen, setCreateConfirmedOpen] = useState(false)
    const [confirmingItem, setConfirmingItem] = useState<ReservationV2 | null>(null)
    const [editingItem, setEditingItem] = useState<ReservationV2 | null>(null)
    const [viewingItem, setViewingItem] = useState<ReservationV2 | null>(null)

    // Contact detail state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [contactReservations, setContactReservations] = useState<ReservationV2[]>([])

    // Prefill for create-from-contact
    const [contactPrefill, setContactPrefill] = useState<{
        guestName?: string
        phone?: string
        email?: string
        notesInternal?: string
    } | null>(null)
    const [prefillKey, setPrefillKey] = useState('')

    // Finalizadas sheet state (Phase 9.3)
    const [finalizeOkItem, setFinalizeOkItem] = useState<ReservationV2 | null>(null)
    const [finalizeIssueItem, setFinalizeIssueItem] = useState<ReservationV2 | null>(null)

    // ============================================================
    // Handlers
    // ============================================================

    // View reservation details (opens ViewSheet)
    function handleViewReservation(r: ReservationV2) {
        setViewingItem(r)
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
            refreshRecords('delete')
        } catch (e) {
            console.error('Delete failed:', e)
            alert('Erro ao excluir')
        }
    }

    // Create reservation for specific date
    function handleCreateReservation(date: string) {
        if (!canWrite) return
        setActionSheetOpen(true)
    }

    // Confirm waiting item
    function handleConfirmWithDetails(r: ReservationV2) {
        if (!canWrite) return
        setConfirmingItem(r)
    }

    // View contact (open detail sheet)
    function handleViewContact(contact: Contact, reservations: ReservationV2[]) {
        setSelectedContact(contact)
        setContactReservations(reservations)
    }

    // Create reservation from contact
    function handleCreateReservationFromContact(contact: Contact) {
        const notes = getBestNotesForContact(contactReservations)
        setContactPrefill({
            guestName: contact.name,
            phone: contact.phone,
            email: contact.email,
            notesInternal: notes,
        })
        setPrefillKey(`${contact.id}:${Date.now()}`)
        setSelectedContact(null) // Close contact sheet
        setCreateConfirmedOpen(true)
    }

    // Create lead from contact
    function handleCreateLeadFromContact(contact: Contact) {
        const notes = getBestNotesForContact(contactReservations)
        setContactPrefill({
            guestName: contact.name,
            phone: contact.phone,
            email: contact.email,
            notesInternal: notes,
        })
        setPrefillKey(`${contact.id}:${Date.now()}`)
        setSelectedContact(null) // Close contact sheet
        setCreateLeadOpen(true)
    }

    // View reservation from contact detail
    function handleViewReservationFromContact(r: ReservationV2) {
        setSelectedContact(null) // Close contact sheet
        setViewingItem(r)
    }

    // Phase 9.3: Finalizadas handlers
    function handleMarkOk(r: ReservationV2) {
        setFinalizeOkItem(r)
    }

    function handleMarkIssue(r: ReservationV2) {
        setFinalizeIssueItem(r)
    }

    async function handleFinalizeOkSave(extraSpend: number, notes?: string) {
        if (!finalizeOkItem) return

        try {
            const now = new Date().toISOString()
            const updatedNotes = notes
                ? appendInternalNote(finalizeOkItem.notesInternal, `[CHECKOUT OK] ${notes}`)
                : finalizeOkItem.notesInternal

            await updateV2Record(finalizeOkItem.id, {
                ...finalizeOkItem,
                extraSpend: extraSpend || finalizeOkItem.extraSpend,
                notesInternal: updatedNotes,
                stayReview: {
                    state: 'ok',
                    reviewedAt: now,
                },
            })
            setFinalizeOkItem(null)
            refreshRecords('finalize-ok')
        } catch (err) {
            console.error('Failed to finalize OK:', err)
        }
    }

    async function handleFinalizeIssueSave(reason: string) {
        if (!finalizeIssueItem) return

        try {
            const now = new Date().toISOString()
            const updatedNotes = appendInternalNote(
                finalizeIssueItem.notesInternal,
                `[CHECKOUT PROBLEMA] ${reason}`
            )

            await updateV2Record(finalizeIssueItem.id, {
                ...finalizeIssueItem,
                notesInternal: updatedNotes,
                stayReview: {
                    state: 'issue',
                    reviewedAt: now,
                    note: reason,
                },
            })
            setFinalizeIssueItem(null)
            refreshRecords('finalize-issue')
        } catch (err) {
            console.error('Failed to finalize issue:', err)
        }
    }

    return (
        <div className="min-h-screen bg-token">
            <main className="mx-auto px-4 py-4 max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
                {/* Sync indicator */}
                {refreshing && !loadingInitial && (
                    <div className="fixed top-2 right-2 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full z-50">
                        Atualizando...
                    </div>
                )}

                {activeTab === 'confirmadas' && (
                    <ConfirmadasPage
                        canWrite={canWrite}
                        records={confirmedRecords}
                        loading={loadingInitial}
                        onViewReservation={handleViewReservation}
                        onEditReservation={handleEditReservation}
                        onDeleteReservation={handleDeleteReservation}
                        onCreateReservation={handleCreateReservation}
                    />
                )}

                {activeTab === 'em-espera' && (
                    <EmEsperaPage
                        canWrite={canWrite}
                        waitingRecords={waitingRecords}
                        rejectedRecords={rejectedRecords}
                        confirmedRecords={confirmedRecords}
                        loading={loadingInitial}
                        onConfirmWithDetails={handleConfirmWithDetails}
                        onRefresh={() => refreshRecords('em-espera-action')}
                        onViewReservation={handleViewReservation}
                    />
                )}

                {activeTab === 'contatos' && (
                    <ContatosPage
                        records={records}
                        loading={loadingInitial}
                        onViewContact={handleViewContact}
                    />
                )}

                {activeTab === 'ferramentas' && (
                    <FerramentasPage canWrite={canWrite} />
                )}

                {activeTab === 'finalizadas' && (
                    <FinalizadasPage
                        records={finishedRecords}
                        loading={loadingInitial}
                        onMarkOk={handleMarkOk}
                        onMarkIssue={handleMarkIssue}
                    />
                )}
            </main>

            <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onCreateClick={canWrite ? () => setActionSheetOpen(true) : undefined}
                finishedCount={finishedRecords.length}
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
                onClose={() => {
                    setCreateLeadOpen(false)
                    setContactPrefill(null)
                }}
                onCreated={() => {
                    refreshRecords('create-lead')
                    setActiveTab('em-espera')
                    setContactPrefill(null)
                }}
                prefill={contactPrefill || undefined}
                prefillKey={prefillKey}
            />

            <ConfirmSheet
                open={createConfirmedOpen || !!confirmingItem}
                onClose={() => {
                    setCreateConfirmedOpen(false)
                    setConfirmingItem(null)
                    setContactPrefill(null)
                }}
                onConfirmed={() => {
                    refreshRecords('confirm')
                    setActiveTab('confirmadas')
                    setContactPrefill(null)
                }}
                item={confirmingItem}
                confirmedRecords={confirmedRecords}
                prefill={contactPrefill || undefined}
                prefillKey={prefillKey}
            />

            <EditReservationSheet
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSaved={() => refreshRecords('edit')}
                item={editingItem}
            />

            <ViewReservationSheet
                open={!!viewingItem}
                onClose={() => setViewingItem(null)}
                onEdit={(item) => {
                    setViewingItem(null)
                    setEditingItem(item)
                }}
                item={viewingItem}
            />

            <ContactDetailSheet
                open={!!selectedContact}
                onClose={() => setSelectedContact(null)}
                contact={selectedContact}
                reservations={contactReservations}
                onViewReservation={handleViewReservationFromContact}
                onCreateReservation={handleCreateReservationFromContact}
                onCreateLead={handleCreateLeadFromContact}
            />

            <FinalizeOkSheet
                open={!!finalizeOkItem}
                onClose={() => setFinalizeOkItem(null)}
                onSave={handleFinalizeOkSave}
                item={finalizeOkItem}
            />

            <FinalizeIssueSheet
                open={!!finalizeIssueItem}
                onClose={() => setFinalizeIssueItem(null)}
                onSave={handleFinalizeIssueSave}
                item={finalizeIssueItem}
            />
        </div>
    )
}
