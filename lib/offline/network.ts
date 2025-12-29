/**
 * Network Status Detection
 * 
 * Provides reactive online/offline detection for the PWA.
 * Debounces status changes to avoid flapping.
 */

type NetworkListener = (online: boolean) => void;

// Listeners for network status changes
const listeners: Set<NetworkListener> = new Set();

// Debounce network changes (500ms)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * Check if currently online
 */
export function isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
}

/**
 * Subscribe to network status changes
 * Returns unsubscribe function
 */
export function subscribeNetworkStatus(listener: NetworkListener): () => void {
    listeners.add(listener);

    // Immediately notify of current status
    listener(isOnline());

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Notify all listeners of status change (debounced)
 */
function notifyListeners(online: boolean) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        // Only notify if status actually changed
        if (currentStatus !== online) {
            currentStatus = online;
            console.log(`[Network] Status changed: ${online ? 'online' : 'offline'}`);
            listeners.forEach(listener => {
                try {
                    listener(online);
                } catch (e) {
                    console.error('[Network] Listener error:', e);
                }
            });
        }
    }, 500);
}

/**
 * Initialize network listeners (call once on app mount)
 */
export function initNetworkDetection(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => notifyListeners(true));
    window.addEventListener('offline', () => notifyListeners(false));

    console.log(`[Network] Initialized. Current status: ${isOnline() ? 'online' : 'offline'}`);
}

/**
 * Get network connection type (best effort, not reliable on all browsers)
 */
export function getConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';

    // @ts-ignore - connection is not in all browsers
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection) return 'unknown';

    return connection.effectiveType || connection.type || 'unknown';
}

/**
 * Check if on WiFi (best effort, for "sync only on WiFi" toggle)
 * Returns true if unknown (fail open for sync)
 */
export function isOnWiFi(): boolean {
    const type = getConnectionType();

    // WiFi-like types
    if (type === 'wifi' || type === 'ethernet') return true;

    // Mobile data types
    if (type === 'cellular' || type === '4g' || type === '3g' || type === '2g') return false;

    // Unknown - assume WiFi to avoid blocking sync
    return true;
}
