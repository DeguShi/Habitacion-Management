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
                lastStayDate: record.checkOut || record.checkIn,
                hasWaiting: false,
                hasRejected: false,
                reservationIds: [],
            });
        }

        const group = groups.get(key)!;

        // Update name if this record has more info
        if (!group.phone && record.phone) {
            group.phone = record.phone;
        }
        if (!group.email && record.email) {
            group.email = record.email;
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
