/**
 * Contact Derivation Utilities
 *
 * Derives a contacts list from reservations by grouping records.
 *
 * GROUPING PRIORITY:
 * 1. By phone (if present)
 * 2. By email (if no phone)
 * 3. By guestName (fallback)
 *
 * NOTE: Phone normalization is deferred to a future phase.
 * Currently uses exact string matching.
 */

import type { ReservationV2 } from "@/core/entities_v2";

/**
 * Derived contact from reservation records
 */
export interface Contact {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    lastStayDate: string;
    totalBookings: number;
    hasWaiting: boolean;
    hasRejected: boolean;
    reservationIds: string[];
}

/**
 * Generates a contact ID from the grouping key.
 * Uses a simple hash for consistent IDs.
 */
function generateContactId(groupKey: string): string {
    // Simple hash for consistent ID generation
    let hash = 0;
    for (let i = 0; i < groupKey.length; i++) {
        const char = groupKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `contact-${Math.abs(hash).toString(36)}`;
}

/**
 * Gets the grouping key for a reservation.
 * Priority: phone > email > guestName
 */
function getGroupKey(record: ReservationV2): string {
    if (record.phone && record.phone.trim()) {
        return `phone:${record.phone.trim()}`;
    }
    if (record.email && record.email.trim()) {
        return `email:${record.email.trim().toLowerCase()}`;
    }
    return `name:${record.guestName.trim().toLowerCase()}`;
}

/**
 * Gets the most recent date from two date strings.
 * Returns the later date.
 */
function getMostRecentDate(date1: string, date2: string): string {
    return date1 > date2 ? date1 : date2;
}

/**
 * Derives contacts from a list of reservations.
 *
 * Groups records by phone > email > guestName and aggregates stats.
 *
 * @param records - Array of ReservationV2 records
 * @returns Array of Contact objects sorted by lastStayDate (descending)
 */
export function deriveContacts(records: ReservationV2[]): Contact[] {
    const groups = new Map<string, {
        name: string;
        phone?: string;
        email?: string;
        birthDate?: string;
        lastStayDate: string;
        hasWaiting: boolean;
        hasRejected: boolean;
        reservationIds: string[];
    }>();

    for (const record of records) {
        const key = getGroupKey(record);

        if (!groups.has(key)) {
            groups.set(key, {
                name: record.guestName,
                phone: record.phone,
                email: record.email,
                birthDate: record.birthDate,
                lastStayDate: record.checkOut || record.checkIn,
                hasWaiting: false,
                hasRejected: false,
                reservationIds: [],
            });
        }

        const group = groups.get(key)!;

        // Update with more info if available
        if (!group.phone && record.phone) {
            group.phone = record.phone;
        }
        if (!group.email && record.email) {
            group.email = record.email;
        }
        if (!group.birthDate && record.birthDate) {
            group.birthDate = record.birthDate;
        }

        // Track most recent stay
        const stayDate = record.checkOut || record.checkIn;
        group.lastStayDate = getMostRecentDate(group.lastStayDate, stayDate);

        // Track statuses
        if (record.status === "waiting") {
            group.hasWaiting = true;
        }
        if (record.status === "rejected") {
            group.hasRejected = true;
        }

        // Add reservation ID
        group.reservationIds.push(record.id);
    }

    // Convert to Contact array
    const contacts: Contact[] = [];
    for (const [key, group] of groups) {
        contacts.push({
            id: generateContactId(key),
            name: group.name,
            phone: group.phone,
            email: group.email,
            birthDate: group.birthDate,
            lastStayDate: group.lastStayDate,
            totalBookings: group.reservationIds.length,
            hasWaiting: group.hasWaiting,
            hasRejected: group.hasRejected,
            reservationIds: group.reservationIds,
        });
    }

    // Sort by lastStayDate descending (most recent first)
    contacts.sort((a, b) => b.lastStayDate.localeCompare(a.lastStayDate));

    return contacts;
}

/**
 * Filters contacts to only those with waiting reservations.
 */
export function getContactsWithWaiting(contacts: Contact[]): Contact[] {
    return contacts.filter((c) => c.hasWaiting);
}

/**
 * Gets the display string for a contact (name + optional phone/email).
 */
export function getContactDisplay(contact: Contact): string {
    if (contact.phone) {
        return `${contact.name} (${contact.phone})`;
    }
    if (contact.email) {
        return `${contact.name} (${contact.email})`;
    }
    return contact.name;
}

// ============================================================
// Search Helpers (Phase 9)
// ============================================================

/**
 * Normalizes a phone number for search (digits only)
 */
export function normalizePhoneForSearch(phone: string | undefined): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

/**
 * Builds a searchable text index from a contact
 * Combines name, email, and phone digits for fast filtering
 */
export function buildContactSearchIndex(contact: Contact): string {
    const parts: string[] = [];
    parts.push(contact.name.toLowerCase());
    if (contact.email) parts.push(contact.email.toLowerCase());
    if (contact.phone) parts.push(normalizePhoneForSearch(contact.phone));
    return parts.join(' ');
}

/**
 * Searches contacts by query (name, phone, or email)
 * Case-insensitive, phone matches digits-only
 */
export function searchContacts(contacts: Contact[], query: string): Contact[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return contacts;

    // If query looks like phone (has digits), also match digits-only
    const queryDigits = trimmed.replace(/\D/g, '');

    return contacts.filter(c => {
        const index = buildContactSearchIndex(c);
        // Match by text includes
        if (index.includes(trimmed)) return true;
        // Match by phone digits if query has digits
        if (queryDigits && normalizePhoneForSearch(c.phone).includes(queryDigits)) return true;
        return false;
    });
}

/**
 * Gets the best notes from a contact's reservations.
 * Picks the most recent notesInternal (by checkIn date, most recent first).
 */
export function getBestNotesForContact(records: ReservationV2[]): string | undefined {
    if (!records || records.length === 0) return undefined;

    // Sort by checkIn date descending (most recent first)
    // Use checkIn as the primary sort key since it's the actual stay date
    const sorted = [...records].sort((a, b) => {
        const dateA = a.checkIn || '';
        const dateB = b.checkIn || '';
        return dateB.localeCompare(dateA);
    });

    // Find first record with meaningful notes
    for (const r of sorted) {
        if (r.notesInternal && r.notesInternal.trim()) {
            return r.notesInternal.trim();
        }
    }

    return undefined;
}

