/**
 * Offline System Initialization
 * 
 * Sets up sync triggers and offline capabilities.
 * Call this on app mount.
 */

import { initNetworkDetection, isOnline } from './network';
import { triggerSync, executeSync } from './sync';
import { db, ensureSyncState } from './db';
import { setOfflineUser, getOfflineUser } from './auth';

let initialized = false;

/**
 * Initialize the offline system
 * @param userEmail - The authenticated user's email (if known)
 * @param userName - The authenticated user's name
 * @param isAdmin - Whether user has write permissions
 */
export async function initOfflineSystem(
    userEmail?: string | null,
    userName?: string | null,
    isAdmin?: boolean
): Promise<void> {
    if (typeof window === 'undefined' || initialized) return;
    initialized = true;

    console.log('[Offline] Initializing...');

    // Cache the authenticated user for offline mode
    if (userEmail) {
        setOfflineUser(userEmail, userName || undefined, isAdmin ?? false);
    }

    // Initialize network detection
    initNetworkDetection();

    // Ensure sync state exists
    await ensureSyncState();

    // Set up visibility change listener (sync on app resume)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isOnline()) {
            console.log('[Offline] App visible, triggering sync');
            triggerSync();
        }
    });

    // Set up online event listener
    window.addEventListener('online', () => {
        console.log('[Offline] Network online, triggering sync');
        triggerSync();
    });

    // Initial sync if online
    if (isOnline()) {
        console.log('[Offline] Online, performing initial sync');
        try {
            await executeSync();
        } catch (e) {
            console.error('[Offline] Initial sync failed:', e);
        }
    } else {
        console.log('[Offline] Offline, skipping initial sync');
    }

    console.log('[Offline] Initialization complete');
}

/**
 * Seed IndexedDB from server (call on first load when online)
 */
export async function seedFromServer(): Promise<boolean> {
    if (!isOnline()) {
        console.log('[Offline] Cannot seed - offline');
        return false;
    }

    try {
        const response = await fetch('/api/reservations', { cache: 'no-store' });
        if (!response.ok) {
            console.error('[Offline] Seed failed:', response.status);
            return false;
        }

        const records = await response.json();
        console.log(`[Offline] Seeding ${records.length} records to IndexedDB`);

        // Import normalize function
        const { normalizeRecord } = await import('@/lib/normalize');

        await db.transaction('rw', db.reservations, async () => {
            for (const raw of records) {
                const { normalized } = normalizeRecord(raw);
                await db.reservations.put(normalized as any);
            }
        });

        // Update sync state
        await db.syncState.update('global', {
            lastFullSyncAt: new Date().toISOString(),
        });

        console.log('[Offline] Seed complete');
        return true;
    } catch (e) {
        console.error('[Offline] Seed error:', e);
        return false;
    }
}

/**
 * Check if we have any cached data in IndexedDB
 */
export async function hasLocalData(): Promise<boolean> {
    try {
        const count = await db.reservations.count();
        return count > 0;
    } catch {
        return false;
    }
}
