/**
 * Sync Engine
 * 
 * Handles synchronization between IndexedDB and server.
 * Uses full list reconcile (not incremental) to detect remote deletions.
 */

import { db, ensureSyncState, type OutboxOperation } from './db';
import { isOnline } from './network';
import {
    getPendingOperations,
    markSyncing,
    removeOperation,
    markFailed,
    resetFailedOperations
} from './outbox';
import type { ReservationV2 } from '@/core/entities_v2';
import { normalizeRecord } from '@/lib/normalize';

// Debounce sync triggers
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

/**
 * Trigger a sync (debounced)
 */
export function triggerSync(): void {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(() => {
        executeSync().catch(err => {
            console.error('[Sync] Error:', err);
        });
    }, 500);
}

/**
 * Execute full sync cycle
 */
export async function executeSync(): Promise<void> {
    if (!isOnline()) {
        console.log('[Sync] Offline, skipping');
        return;
    }

    if (isSyncing) {
        console.log('[Sync] Already in progress, skipping');
        return;
    }

    isSyncing = true;
    const syncState = await ensureSyncState();

    try {
        await db.syncState.update('global', {
            syncInProgress: true,
            lastSyncAttemptAt: new Date().toISOString(),
        });

        console.log('[Sync] Starting sync cycle...');

        // Step 1: Process outbox
        await processOutbox();

        // Step 2: Full list reconcile
        await reconcileWithServer();

        // Step 3: Cleanup orphaned pending entries
        await cleanupOrphanedMeta();

        // Update sync state
        await db.syncState.update('global', {
            syncInProgress: false,
            lastFullSyncAt: new Date().toISOString(),
        });

        console.log('[Sync] Cycle complete');

        // Notify UI
        window.dispatchEvent(new CustomEvent('sync-complete'));

    } catch (error) {
        console.error('[Sync] Cycle failed:', error);
        await db.syncState.update('global', { syncInProgress: false });
        window.dispatchEvent(new CustomEvent('sync-error', { detail: error }));
    } finally {
        isSyncing = false;
    }
}

/**
 * Process outbox operations
 */
async function processOutbox(): Promise<void> {
    // Reset failed ops with low retry count
    await resetFailedOperations();

    const ops = await getPendingOperations();
    console.log(`[Sync] Processing ${ops.length} outbox operations`);

    for (const op of ops) {
        try {
            await markSyncing(op.entityId);
            await executeOperation(op);
            await removeOperation(op.entityId);

            // Clear pending flag in localMeta
            await db.localMeta.update(op.entityId, { isPending: false });

        } catch (error: any) {
            if (error.status === 409) {
                // Conflict detected
                await handleConflict(op, error.current);
            } else if (error.status === 401 || error.status === 403) {
                // Auth error - stop processing
                console.error('[Sync] Auth error, stopping outbox processing');
                await markFailed(op.entityId, 'Auth error');
                break;
            } else if (error.name === 'TypeError' || error.message?.includes('network')) {
                // Network error - stop processing
                console.error('[Sync] Network error, stopping outbox processing');
                await markFailed(op.entityId, 'Network error');
                break;
            } else {
                // Other error - mark failed and continue
                await markFailed(op.entityId, error.message || 'Unknown error');
            }
        }
    }
}

/**
 * Execute a single outbox operation
 */
async function executeOperation(op: OutboxOperation): Promise<ReservationV2> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': op.opId,
    };

    // Add If-Match for update/delete
    if (op.type !== 'create' && op.baseUpdatedAt) {
        headers['If-Match'] = `"${op.baseUpdatedAt}"`;
    }

    let url: string;
    let method: string;
    let body: string | undefined;

    switch (op.type) {
        case 'create':
            url = '/api/reservations';
            method = 'POST';
            body = JSON.stringify(op.payload);
            break;
        case 'update':
            url = `/api/reservations/${op.entityId}`;
            method = 'PUT';
            body = JSON.stringify(op.payload);
            break;
        case 'delete':
            url = `/api/reservations/${op.entityId}`;
            method = 'DELETE';
            break;
        default:
            throw new Error(`Unknown operation type: ${op.type}`);
    }

    const response = await fetch(url, {
        method,
        headers,
        body,
    });

    if (response.status === 409) {
        const data = await response.json();
        const error = new Error('Conflict') as any;
        error.status = 409;
        error.current = data.current;
        throw error;
    }

    if (response.status === 401 || response.status === 403) {
        const error = new Error('Unauthorized') as any;
        error.status = response.status;
        throw error;
    }

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    if (op.type === 'delete') {
        return {} as ReservationV2;
    }

    const data = await response.json();

    // Update local cache with server response
    const { normalized } = normalizeRecord(data);
    await db.reservations.put(normalized as unknown as ReservationV2);

    return normalized as unknown as ReservationV2;
}

/**
 * Handle conflict (409 response)
 */
async function handleConflict(op: OutboxOperation, remoteData: unknown): Promise<void> {
    console.log(`[Sync] Conflict detected for ${op.entityId}`);

    const { normalized: remoteRecord } = normalizeRecord(remoteData as Record<string, unknown>);
    const localRecord = await db.reservations.get(op.entityId);

    if (!localRecord) {
        console.warn(`[Sync] Local record not found for conflict: ${op.entityId}`);
        return;
    }

    // Create conflict entry
    await db.conflicts.put({
        conflictId: crypto.randomUUID(),
        entityId: op.entityId,
        localRecord,
        remoteRecord: remoteRecord as unknown as ReservationV2,
        detectedAt: new Date().toISOString(),
    });

    // Mark in localMeta
    await db.localMeta.update(op.entityId, { isConflict: true });

    // Remove from outbox (will re-queue after resolution)
    await removeOperation(op.entityId);

    console.log(`[Sync] Created conflict entry for ${op.entityId}`);
}

/**
 * Full list reconcile with server
 * Detects remote deletions by comparing IDs
 */
async function reconcileWithServer(): Promise<void> {
    console.log('[Sync] Starting full list reconcile...');

    // Fetch all records from server
    const response = await fetch('/api/reservations', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch reservations: ${response.status}`);
    }

    const serverRecords: unknown[] = await response.json();
    console.log(`[Sync] Server has ${serverRecords.length} records`);

    // Build set of server IDs
    const serverIds = new Set<string>();
    for (const raw of serverRecords) {
        const { normalized } = normalizeRecord(raw as Record<string, unknown>);
        const record = normalized as unknown as ReservationV2;
        serverIds.add(record.id);

        // Check if we should update local
        const local = await db.reservations.get(record.id);
        const meta = await db.localMeta.get(record.id);

        // Don't overwrite pending local changes
        if (meta?.isPending) {
            console.log(`[Sync] Skipping ${record.id} (has pending local changes)`);
            continue;
        }

        // Upsert if local doesn't exist or server is newer
        if (!local || (local.updatedAt || '') < (record.updatedAt || '')) {
            await db.reservations.put(record);
            console.log(`[Sync] Updated local: ${record.id}`);
        }
    }

    // Detect remote deletions
    const allLocal = await db.reservations.toArray();
    for (const local of allLocal) {
        if (!serverIds.has(local.id)) {
            const meta = await db.localMeta.get(local.id);

            // Don't delete if has pending local changes
            if (meta?.isPending) {
                console.log(`[Sync] Keeping ${local.id} (pending, but not on server)`);
                continue;
            }

            // Remote deletion detected
            console.log(`[Sync] Deleting local: ${local.id} (not on server)`);
            await db.reservations.delete(local.id);
            await db.localMeta.delete(local.id);
        }
    }

    console.log('[Sync] Reconcile complete');
}

/**
 * Cleanup orphaned localMeta entries
 * Clears pending flag for entries that have no corresponding outbox operation
 */
async function cleanupOrphanedMeta(): Promise<void> {
    console.log('[Sync] Cleaning up orphaned metadata...');

    // Get all pending localMeta entries
    const pendingMetas = await db.localMeta.where('isPending').equals(1).toArray();

    for (const meta of pendingMetas) {
        // Check if there's a corresponding outbox entry
        const outboxEntry = await db.outbox.get(meta.entityId);

        if (!outboxEntry) {
            // No outbox entry means this was already synced or orphaned
            console.log(`[Sync] Clearing orphaned pending flag for ${meta.entityId}`);
            await db.localMeta.update(meta.entityId, { isPending: false });
        }
    }

    console.log('[Sync] Orphan cleanup complete');
}

/**
 * Force initial sync (call on app load)
 */
export async function initialSync(): Promise<void> {
    console.log('[Sync] Performing initial sync...');
    await executeSync();
}
