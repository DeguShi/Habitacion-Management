/**
 * Sync Triggers (iOS-realistic)
 * 
 * Triggers sync on:
 * - App visibility change (resume from background)
 * - Network online event
 * - Periodic timer while app is open
 * - Manual trigger
 * 
 * Note: iOS does NOT support reliable background sync.
 */

import { triggerSync, initialSync } from './sync';
import { isOnline } from './network';

let periodicTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

// Sync every 5 minutes while app is visible
const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000;

/**
 * Initialize sync triggers (call once on app mount)
 */
export function initSyncTriggers(): void {
    if (typeof window === 'undefined' || initialized) return;
    initialized = true;

    console.log('[SyncTriggers] Initializing...');

    // Initial sync on load
    if (isOnline()) {
        initialSync().catch(err => {
            console.error('[SyncTriggers] Initial sync failed:', err);
        });
    }

    // Sync when app comes to foreground
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('[SyncTriggers] App visible, triggering sync');
            if (isOnline()) {
                triggerSync();
            }
            startPeriodicSync();
        } else {
            console.log('[SyncTriggers] App hidden, stopping periodic sync');
            stopPeriodicSync();
        }
    });

    // Sync when network comes back
    window.addEventListener('online', () => {
        console.log('[SyncTriggers] Network online, triggering sync');
        triggerSync();
    });

    // Start periodic sync
    if (document.visibilityState === 'visible') {
        startPeriodicSync();
    }

    console.log('[SyncTriggers] Initialized');
}

/**
 * Start periodic sync timer
 */
function startPeriodicSync(): void {
    if (periodicTimer) return;

    periodicTimer = setInterval(() => {
        if (isOnline() && document.visibilityState === 'visible') {
            console.log('[SyncTriggers] Periodic sync');
            triggerSync();
        }
    }, PERIODIC_SYNC_INTERVAL);

    console.log('[SyncTriggers] Periodic sync started');
}

/**
 * Stop periodic sync timer
 */
function stopPeriodicSync(): void {
    if (periodicTimer) {
        clearInterval(periodicTimer);
        periodicTimer = null;
        console.log('[SyncTriggers] Periodic sync stopped');
    }
}

/**
 * Force manual sync
 */
export function manualSync(): void {
    if (!isOnline()) {
        console.log('[SyncTriggers] Cannot sync while offline');
        return;
    }
    console.log('[SyncTriggers] Manual sync triggered');
    triggerSync();
}
