/**
 * IDB-First Data Layer
 * 
 * All UI reads from IndexedDB (source of truth).
 * All writes go to IndexedDB + outbox for sync.
 */

import { db, type LocalMeta } from './db';
import { queueOperation } from './outbox';
import { isOnline } from './network';
import { triggerSync } from './sync';
import type { ReservationV2 } from '@/core/entities_v2';

/**
 * List all reservations from IndexedDB
 */
export async function listLocalReservations(): Promise<ReservationV2[]> {
    return db.reservations.toArray();
}

/**
 * List reservations by status
 */
export async function listLocalByStatus(status: string | string[]): Promise<ReservationV2[]> {
    const statuses = Array.isArray(status) ? status : [status];
    return db.reservations.where('status').anyOf(statuses).toArray();
}

/**
 * Get single reservation from IndexedDB
 */
export async function getLocalReservation(id: string): Promise<ReservationV2 | undefined> {
    return db.reservations.get(id);
}

/**
 * Create reservation locally and queue for sync
 */
export async function createLocalReservation(
    input: Omit<ReservationV2, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ReservationV2> {
    const now = new Date().toISOString();
    const id = input.id || crypto.randomUUID(); // Client-generated for idempotency

    const record: ReservationV2 = {
        ...input,
        id,
        schemaVersion: 2,
        createdAt: now,
        updatedAt: now,
    } as ReservationV2;

    // Write to IDB immediately
    await db.reservations.put(record);

    // Mark as pending
    await db.localMeta.put({
        entityId: id,
        isPending: true,
        isConflict: false,
        localUpdatedAt: now,
    });

    // Queue for sync
    await queueOperation(id, 'create', record as unknown as Record<string, unknown>, now);

    // Trigger sync if online
    if (isOnline()) {
        triggerSync();
    }

    return record;
}

/**
 * Update reservation locally and queue for sync
 */
export async function updateLocalReservation(
    id: string,
    changes: Partial<ReservationV2>
): Promise<ReservationV2> {
    const existing = await db.reservations.get(id);
    if (!existing) throw new Error('Record not found');

    const now = new Date().toISOString();
    const baseUpdatedAt = existing.updatedAt; // Before local changes

    const updated: ReservationV2 = {
        ...existing,
        ...changes,
        id,
        updatedAt: now,
    };

    // Write to IDB immediately
    await db.reservations.put(updated);

    // Update localMeta
    const meta = await db.localMeta.get(id);
    await db.localMeta.put({
        entityId: id,
        isPending: true,
        isConflict: meta?.isConflict ?? false,
        lastSyncedAt: meta?.lastSyncedAt,
        localUpdatedAt: now,
    });

    // Queue for sync (will coalesce)
    await queueOperation(id, 'update', updated as unknown as Record<string, unknown>, baseUpdatedAt);

    if (isOnline()) {
        triggerSync();
    }

    return updated;
}

/**
 * Delete reservation locally and queue for sync
 */
export async function deleteLocalReservation(id: string): Promise<void> {
    const existing = await db.reservations.get(id);
    if (!existing) return; // Already gone

    const baseUpdatedAt = existing.updatedAt;

    // Queue operation (may coalesce to remove entirely if was pending create)
    await queueOperation(id, 'delete', {}, baseUpdatedAt);

    // Delete from local IDB
    await db.reservations.delete(id);
    await db.localMeta.delete(id);

    if (isOnline()) {
        triggerSync();
    }
}

/**
 * Add payment event to reservation
 * Uses stable client-generated UUID for idempotent merge
 */
export async function addLocalPaymentEvent(
    reservationId: string,
    event: { amount: number; date: string; method?: string; note?: string }
): Promise<ReservationV2> {
    const existing = await db.reservations.get(reservationId);
    if (!existing) throw new Error('Reservation not found');

    // Client generates stable UUID for payment event (idempotency)
    const newEvent = {
        id: crypto.randomUUID(),
        ...event,
    };

    const updatedPayment = {
        ...existing.payment,
        events: [...(existing.payment?.events || []), newEvent],
    };

    return updateLocalReservation(reservationId, { payment: updatedPayment });
}

/**
 * Remove payment event from reservation
 */
export async function removeLocalPaymentEvent(
    reservationId: string,
    eventId: string
): Promise<ReservationV2> {
    const existing = await db.reservations.get(reservationId);
    if (!existing) throw new Error('Reservation not found');

    const updatedPayment = {
        ...existing.payment,
        events: (existing.payment?.events || []).filter(e => e.id !== eventId),
    };

    return updateLocalReservation(reservationId, { payment: updatedPayment });
}

/**
 * Get local metadata for a reservation
 */
export async function getLocalMeta(entityId: string): Promise<LocalMeta | undefined> {
    return db.localMeta.get(entityId);
}

/**
 * Check if any reservations have pending changes
 */
export async function hasAnyPendingChanges(): Promise<boolean> {
    const count = await db.localMeta.where('isPending').equals(1).count();
    return count > 0;
}
