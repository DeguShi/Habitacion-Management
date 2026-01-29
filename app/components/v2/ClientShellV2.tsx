'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { signOut } from 'next-auth/react'
import { useBirthdayBell } from '@/app/components/v2/BirthdayBellContext'
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
import DeleteConfirmDialog from '@/app/components/v2/DeleteConfirmDialog'
import BirthdayNotificationsSheet from '@/app/components/v2/BirthdayNotificationsSheet'
import type { ReservationV2 } from '@/core/entities_v2'
import { deriveContacts, getBestNotesForContact, type Contact } from '@/lib/contacts'
import { getContactsWithBirthdayThisWeek } from '@/lib/birthdays'
import { getFinishedPending, appendInternalNote } from '@/lib/finished-utils'
import { deleteV2Record } from '@/lib/offline/v2-offline'
import { listV2Records, updateV2Record } from '@/lib/data/v2'

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
    demoMode?: boolean
    offlineMode?: boolean
}

export default function ClientShellV2({ canWrite = false, demoMode = false, offlineMode = false }: ClientShellV2Props) {
    const effectiveCanWrite = canWrite && !demoMode
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
     * Load records from IndexedDB (for offline mode only)
     */
    const loadFromIDB = useCallback(async () => {
        try {
            const { db } = await import('@/lib/offline/db')
            const localRecords = await db.reservations.toArray()
            setRecords(localRecords)
            if (DEBUG) console.log('[fetch] Loaded', localRecords.length, 'records from IndexedDB')
            return localRecords
        } catch (e) {
            console.error('[fetch] Failed to load from IndexedDB:', e)
            return []
        }
    }, [])

    /**
     * Cache records to IndexedDB (for offline access later)
     */
    const cacheToIDB = useCallback(async (records: ReservationV2[]) => {
        try {
            const { db } = await import('@/lib/offline/db')
            await db.transaction('rw', db.reservations, async () => {
                for (const record of records) {
                    await db.reservations.put(record)
                }
            })
            if (DEBUG) console.log('[cache] Cached', records.length, 'records to IndexedDB')
        } catch (e) {
            console.warn('[cache] Failed to cache to IndexedDB:', e)
        }
    }, [])

    /**
     * Refresh records: API when online, IDB when offline
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

        const isCurrentlyOffline = offlineMode || (typeof navigator !== 'undefined' && !navigator.onLine)

        try {
            if (isCurrentlyOffline) {
                // OFFLINE: Load from IndexedDB
                await loadFromIDB()
            } else {
                // ONLINE: Fetch from API (original behavior)
                if (DEBUG) console.log('[fetch] Fetching from API...')
                const next = await listV2Records()
                setRecords(next)
                if (DEBUG) console.log('[fetch] Got', next.length, 'records from API')

                // Cache to IDB for offline use (non-blocking)
                cacheToIDB(next)

                // Update viewingItem if it exists
                setViewingItem(prev => {
                    if (!prev) return null
                    const updated = next.find(r => r.id === prev.id)
                    return updated || null
                })
            }
        } catch (e: any) {
            console.error('Failed to fetch records:', e)
            // On network error when supposedly online, fall back to IDB
            if (e.name === 'TypeError' || e.message?.includes('network') || e.message?.includes('fetch')) {
                console.log('[fetch] Network error, falling back to IndexedDB')
                await loadFromIDB()
            } else {
                setError(e?.message || 'Erro ao carregar')
            }
        } finally {
            setRefreshing(false)
            setLoadingInitial(false)
            refreshingRef.current = false

            if (queuedRef.current) {
                queuedRef.current = false
                if (DEBUG) console.log('[fetch] Processing queued refresh')
                void refreshRecords('queued')
            }
        }
    }, [offlineMode, loadFromIDB, cacheToIDB])

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

    // Derive contacts once (centralized, avoid re-deriving in child pages)
    const contacts = useMemo(
        () => deriveContacts(records),
        [records]
    )

    // Compute birthdays for current week
    const birthdayContacts = useMemo(
        () => getContactsWithBirthdayThisWeek(contacts),
        [contacts]
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

    // Calendar date for pre-filling check-in when creating from calendar
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)

    // Finalizadas sheet state (Phase 9.3)
    const [finalizeOkItem, setFinalizeOkItem] = useState<ReservationV2 | null>(null)
    const [finalizeIssueItem, setFinalizeIssueItem] = useState<ReservationV2 | null>(null)

    // Birthday bell context - syncs count and sheet state with Navbar
    const { setCount, isOpen: birthdaySheetOpen, closeSheet: closeBirthdaySheet } = useBirthdayBell()

    // Track dismissed birthday IDs (actual IDs, not just count)
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

    // Load dismissed IDs on mount and listen for changes
    useEffect(() => {
        const updateDismissedIds = () => {
            if (typeof window === 'undefined') return
            try {
                const stored = localStorage.getItem('birthday-dismissed')
                if (!stored) {
                    setDismissedIds(new Set())
                    return
                }
                const now = new Date()
                const startOfYear = new Date(now.getFullYear(), 0, 1)
                const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
                const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
                const currentWeekId = `${now.getFullYear()}-W${String(week).padStart(2, '0')}`

                const { weekId, ids } = JSON.parse(stored)
                if (weekId !== currentWeekId) {
                    setDismissedIds(new Set())
                    return
                }
                setDismissedIds(new Set(Array.isArray(ids) ? ids : []))
            } catch {
                setDismissedIds(new Set())
            }
        }

        updateDismissedIds()

        // Listen for dismiss changes from the sheet
        window.addEventListener('birthday-dismissed-change', updateDismissedIds)
        return () => window.removeEventListener('birthday-dismissed-change', updateDismissedIds)
    }, [])

    // Calculate visible birthday count by filtering contacts by ID (not arithmetic!)
    const visibleBirthdayCount = useMemo(
        () => birthdayContacts.filter(c => !dismissedIds.has(c.id)).length,
        [birthdayContacts, dismissedIds]
    )

    // Sync visible birthday count to context
    useEffect(() => {
        setCount(visibleBirthdayCount)
    }, [visibleBirthdayCount, setCount])

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
    const [pendingDelete, setPendingDelete] = useState<ReservationV2 | null>(null)

    function handleDeleteReservation(r: ReservationV2) {
        if (!canWrite) return
        setPendingDelete(r)
    }

    async function confirmDelete() {
        if (!pendingDelete) return
        try {
            await deleteV2Record(pendingDelete.id)
            refreshRecords('delete')
        } catch (e) {
            console.error('Delete failed:', e)
        }
        setPendingDelete(null)
    }

    // Create reservation for specific date (from calendar)
    function handleCreateReservation(date: string) {
        if (!canWrite) return
        setCalendarSelectedDate(date)
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
        <div className="min-h-screen eco-bg">
            <main className="mx-auto px-4 py-4 max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
                {/* Sync indicator */}
                {refreshing && !loadingInitial && (
                    <div className="fixed top-2 right-2 text-xs bg-blue-100  text-blue-700  px-2 py-1 rounded-full z-50">
                        Atualizando...
                    </div>
                )}

                {/* Demo mode banner */}
                {demoMode && (
                    <div className="mb-4 p-3 rounded-xl eco-surface border-2 border-[var(--eco-warning)] text-center">
                        <span className="text-sm font-medium" style={{ color: 'var(--eco-warning)' }}>
                            Modo demonstração — alterações desativadas
                        </span>
                    </div>
                )}



                {activeTab === 'confirmadas' && (
                    <ConfirmadasPage
                        canWrite={effectiveCanWrite}
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
                        canWrite={effectiveCanWrite}
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
                        contacts={contacts}
                        loading={loadingInitial}
                        onViewContact={handleViewContact}
                        onViewReservation={handleViewReservation}
                        onCreateReservation={handleCreateReservationFromContact}
                        onCreateLead={handleCreateLeadFromContact}
                    />
                )}

                {activeTab === 'ferramentas' && (
                    <FerramentasPage canWrite={effectiveCanWrite} />
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
                onCreateClick={effectiveCanWrite ? () => setActionSheetOpen(true) : undefined}
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
                    setCalendarSelectedDate(null)
                }}
                onCreated={() => {
                    refreshRecords('create-lead')
                    setActiveTab('em-espera')
                    setContactPrefill(null)
                    setCalendarSelectedDate(null)
                }}
                prefill={contactPrefill || undefined}
                prefillKey={prefillKey}
                prefillCheckIn={calendarSelectedDate || undefined}
            />

            <ConfirmSheet
                open={createConfirmedOpen || !!confirmingItem}
                onClose={() => {
                    setCreateConfirmedOpen(false)
                    setConfirmingItem(null)
                    setContactPrefill(null)
                    setCalendarSelectedDate(null)
                }}
                onConfirmed={() => {
                    refreshRecords('confirm')
                    setActiveTab('confirmadas')
                    setContactPrefill(null)
                    setCalendarSelectedDate(null)
                }}
                item={confirmingItem}
                confirmedRecords={confirmedRecords}
                prefill={contactPrefill || undefined}
                prefillKey={prefillKey}
                prefillCheckIn={calendarSelectedDate || undefined}
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

            <DeleteConfirmDialog
                open={!!pendingDelete}
                guestName={pendingDelete?.guestName || ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />

            <BirthdayNotificationsSheet
                open={birthdaySheetOpen}
                onClose={closeBirthdaySheet}
                contacts={birthdayContacts}
            />
        </div>
    )
}
