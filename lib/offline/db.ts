/**
 * Offline Database Schema (Dexie/IndexedDB)
 * 
 * This is the SOURCE OF TRUTH for the client UI.
 * Network is only a replication target/source.
 */

import Dexie, { type Table } from 'dexie';
import type { ReservationV2 } from '@/core/entities_v2';

/**
 * Local metadata for each reservation (separate from domain entity)
 * Tracks sync state without polluting ReservationV2
 */
export interface LocalMeta {
    entityId: string;          // reservation ID (PK)
    isPending: boolean;        // has unsynced changes
    isConflict: boolean;       // conflict detected
    lastSyncedAt?: string;     // when this record was last synced
    localUpdatedAt: string;    // local modification timestamp
}

/**
 * Global sync state (singleton)
 */
export interface SyncState {
    key: 'global';             // singleton key
    lastFullSyncAt?: string;   // when we last did full reconcile
    lastSyncAttemptAt?: string;
    syncInProgress: boolean;
}

/**
 * Coalesced outbox operation
 * Only ONE operation per entityId in the queue at any time
 */
export interface OutboxOperation {
    entityId: string;          // PK - one op per entity
    opId: string;              // UUID for idempotency header
    type: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;  // full record for create/update
    baseUpdatedAt: string;     // updatedAt before local changes (for If-Match)
    createdAt: string;         // when first op was queued
    lastModifiedAt: string;    // when last coalesced
    retryCount: number;
    lastError?: string;
    status: 'pending' | 'syncing' | 'failed';
}

/**
 * Conflict requiring user resolution
 */
export interface Conflict {
    conflictId: string;        // PK
    entityId: string;
    localRecord: ReservationV2;
    remoteRecord: ReservationV2;
    detectedAt: string;
    resolution?: 'local' | 'remote' | 'merged';
    resolvedAt?: string;
}

/**
 * Habitacion Offline Database
 */
export class HabitacionDB extends Dexie {
    reservations!: Table<ReservationV2, string>;
    localMeta!: Table<LocalMeta, string>;
    outbox!: Table<OutboxOperation, string>;  // PK = entityId (one op per entity)
    syncState!: Table<SyncState, string>;
    conflicts!: Table<Conflict, string>;

    constructor() {
        super('HabitacionDB');

        this.version(1).stores({
            // Reservations: id is PK, indexes for common queries
            reservations: 'id, status, checkIn, checkOut, updatedAt, guestName',
            // LocalMeta: entityId is PK, index pending/conflict for quick lookups
            localMeta: 'entityId, isPending, isConflict',
            // Outbox: entityId is PK (ensures one op per entity), index for processing order
            outbox: 'entityId, status, createdAt',
            // SyncState: key is PK (singleton 'global')
            syncState: 'key',
            // Conflicts: conflictId is PK, index by entityId
            conflicts: 'conflictId, entityId',
        });
    }
}

// Singleton database instance
export const db = new HabitacionDB();

/**
 * Initialize sync state if not exists
 */
export async function ensureSyncState(): Promise<SyncState> {
    let state = await db.syncState.get('global');
    if (!state) {
        state = {
            key: 'global',
            syncInProgress: false,
        };
        await db.syncState.put(state);
    }
    return state;
}

/**
 * Get count of pending operations
 */
export async function getPendingCount(): Promise<number> {
    return db.outbox.where('status').anyOf(['pending', 'syncing']).count();
}

/**
 * Get count of unresolved conflicts
 */
export async function getConflictCount(): Promise<number> {
    return db.conflicts.filter(c => !c.resolution).count();
}

/**
 * Clear all offline data (for debugging/reset)
 * WARNING: This will lose all pending changes!
 */
export async function clearAllOfflineData(): Promise<void> {
    await db.transaction('rw', [db.reservations, db.localMeta, db.outbox, db.syncState, db.conflicts], async () => {
        await db.reservations.clear();
        await db.localMeta.clear();
        await db.outbox.clear();
        await db.conflicts.clear();
        await db.syncState.put({
            key: 'global',
            syncInProgress: false,
        });
    });
}
