/**
 * Outbox Queue Manager (with Coalescing)
 * 
 * Ensures only ONE operation per entityId in the queue.
 * Coalesces multiple edits into a single operation.
 */

import { db, type OutboxOperation } from './db';

/**
 * Queue an operation for sync (with coalescing)
 * 
 * Coalescing rules:
 * - CREATE + UPDATE → merged CREATE
 * - UPDATE + UPDATE → merged UPDATE (keep original baseUpdatedAt)
 * - CREATE + DELETE → remove from outbox entirely
 * - UPDATE + DELETE → single DELETE
 */
export async function queueOperation(
    entityId: string,
    type: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    baseUpdatedAt: string
): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.outbox.get(entityId);

    if (!existing) {
        // No existing op — create new
        await db.outbox.put({
            entityId,
            opId: crypto.randomUUID(),
            type,
            payload,
            baseUpdatedAt,
            createdAt: now,
            lastModifiedAt: now,
            retryCount: 0,
            status: 'pending',
        });
        console.log(`[Outbox] Queued ${type} for ${entityId}`);
        return;
    }

    // Coalesce with existing operation
    const coalesced = coalesceOps(existing, { type, payload, baseUpdatedAt });

    if (coalesced === null) {
        // CREATE + DELETE = remove entirely (never existed on server)
        await db.outbox.delete(entityId);
        await db.reservations.delete(entityId);
        await db.localMeta.delete(entityId);
        console.log(`[Outbox] Removed ${entityId} (create+delete coalesced to nothing)`);
        return;
    }

    await db.outbox.put({
        ...existing,
        ...coalesced,
        lastModifiedAt: now,
    });
    console.log(`[Outbox] Coalesced ${existing.type}+${type} → ${coalesced.type} for ${entityId}`);
}

/**
 * Coalesce two operations
 * Returns null if the result is "no operation needed"
 */
function coalesceOps(
    existing: OutboxOperation,
    incoming: { type: string; payload: Record<string, unknown>; baseUpdatedAt: string }
): Partial<OutboxOperation> | null {

    // CREATE + DELETE → null (remove both)
    if (existing.type === 'create' && incoming.type === 'delete') {
        return null;
    }

    // CREATE + UPDATE → merged CREATE
    if (existing.type === 'create' && incoming.type === 'update') {
        return {
            type: 'create',
            payload: { ...existing.payload, ...incoming.payload },
            // Keep original baseUpdatedAt (creation time)
        };
    }

    // UPDATE + UPDATE → merged UPDATE
    if (existing.type === 'update' && incoming.type === 'update') {
        return {
            type: 'update',
            payload: { ...existing.payload, ...incoming.payload },
            // Keep ORIGINAL baseUpdatedAt (server version before any local changes)
        };
    }

    // UPDATE + DELETE → DELETE
    if (existing.type === 'update' && incoming.type === 'delete') {
        return {
            type: 'delete',
            payload: {},
            // Keep original baseUpdatedAt
        };
    }

    // DELETE + anything → shouldn't happen, but just replace
    // Fallback: replace with incoming
    return {
        type: incoming.type as 'create' | 'update' | 'delete',
        payload: incoming.payload,
        baseUpdatedAt: incoming.baseUpdatedAt,
    };
}

/**
 * Get all pending operations in order (oldest first)
 */
export async function getPendingOperations(): Promise<OutboxOperation[]> {
    return db.outbox
        .where('status')
        .anyOf(['pending', 'failed'])
        .sortBy('createdAt');
}

/**
 * Mark operation as syncing
 */
export async function markSyncing(entityId: string): Promise<void> {
    await db.outbox.update(entityId, { status: 'syncing' });
}

/**
 * Remove operation from outbox (on success)
 */
export async function removeOperation(entityId: string): Promise<void> {
    await db.outbox.delete(entityId);
    console.log(`[Outbox] Removed ${entityId} (synced successfully)`);
}

/**
 * Mark operation as failed with error
 */
export async function markFailed(entityId: string, error: string): Promise<void> {
    const op = await db.outbox.get(entityId);
    if (!op) return;

    await db.outbox.update(entityId, {
        status: 'failed',
        lastError: error,
        retryCount: op.retryCount + 1,
    });
    console.log(`[Outbox] Failed ${entityId}: ${error} (retry ${op.retryCount + 1})`);
}

/**
 * Reset failed operations to pending (for retry)
 */
export async function resetFailedOperations(): Promise<number> {
    const failed = await db.outbox.where('status').equals('failed').toArray();

    for (const op of failed) {
        // Only retry if under max retries
        if (op.retryCount < 5) {
            await db.outbox.update(op.entityId, { status: 'pending' });
        }
    }

    return failed.filter(op => op.retryCount < 5).length;
}
