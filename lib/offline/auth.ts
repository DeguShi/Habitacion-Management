/**
 * Offline Authentication Management
 * 
 * Persists the last authenticated user to allow offline mode.
 * On offline, if we have a cached user, we allow offline access.
 */

const STORAGE_KEY = 'habitacion-offline-user';

export interface OfflineUser {
    email: string;
    name?: string;
    isAdmin: boolean;
    cachedAt: string;
}

/**
 * Get the cached offline user (if any)
 */
export function getOfflineUser(): OfflineUser | null {
    if (typeof localStorage === 'undefined') return null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as OfflineUser;
    } catch {
        return null;
    }
}

/**
 * Set the offline user (call on successful login)
 */
export function setOfflineUser(email: string, name: string | undefined, isAdmin: boolean): void {
    if (typeof localStorage === 'undefined') return;

    const user: OfflineUser = {
        email,
        name,
        isAdmin,
        cachedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    console.log('[OfflineAuth] Cached user:', email);
}

/**
 * Clear the offline user (call on logout)
 */
export function clearOfflineUser(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    console.log('[OfflineAuth] Cleared cached user');
}

/**
 * Check if we can operate in offline mode
 * (have a previously authenticated user)
 */
export function canOperateOffline(): boolean {
    return getOfflineUser() !== null;
}

/**
 * Check if we're currently offline
 */
export function isCurrentlyOffline(): boolean {
    if (typeof navigator === 'undefined') return false;
    return !navigator.onLine;
}
