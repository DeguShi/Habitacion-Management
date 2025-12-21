/**
 * Finished Stays Utilities (Phase 9.3)
 * 
 * Utilities for determining if a reservation is "finished" (post-checkout)
 * and managing the review inbox.
 * 
 * TIMEZONE: Uses São Paulo (America/Sao_Paulo) for all calculations.
 * Checkout cutoff: 12:00 (noon) on checkout date.
 */

import type { ReservationV2 } from "@/core/entities_v2";

/**
 * São Paulo timezone offset from UTC.
 * Brazil Standard Time: UTC-3 (no DST since 2019)
 */
const SAO_PAULO_OFFSET_HOURS = -3;

/**
 * Gets the current time in São Paulo timezone.
 */
function getNowInSaoPaulo(now?: Date): Date {
    const d = now || new Date();
    // Convert to São Paulo local time
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
    const saoPauloMs = utcMs + SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000;
    return new Date(saoPauloMs);
}

/**
 * Checks if the current time is after checkout noon in São Paulo.
 * 
 * @param checkOut - Checkout date in YYYY-MM-DD format
 * @param now - Optional current time (for testing)
 * @returns true if current time is after noon on checkout date
 */
export function isAfterCheckoutNoonBRT(checkOut: string, now?: Date): boolean {
    if (!checkOut) return false;

    const saoPauloNow = getNowInSaoPaulo(now);

    // Parse checkout date (YYYY-MM-DD)
    const [year, month, day] = checkOut.split('-').map(Number);

    // Create checkout noon in São Paulo (same reference frame as now)
    const checkoutNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
    // Adjust for São Paulo reference
    const checkoutNoonSaoPaulo = new Date(
        checkoutNoon.getTime() - checkoutNoon.getTimezoneOffset() * 60 * 1000
        + SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000
    );

    // Compare in the same timezone reference
    return saoPauloNow > checkoutNoon;
}

/**
 * Gets all finished reservations that are pending review.
 * 
 * A reservation is "finished & pending" when:
 * - status is "confirmed" (or missing for legacy)
 * - current time is past checkout noon (BRT)
 * - stayReview is missing or stayReview.state === "pending"
 * 
 * @param records - All v2 reservation records
 * @param now - Optional current time (for testing)
 * @returns Array of finished pending reservations
 */
export function getFinishedPending(records: ReservationV2[], now?: Date): ReservationV2[] {
    return records.filter(r => {
        // Must be confirmed (or missing status for legacy)
        if (r.status && r.status !== 'confirmed') return false;

        // Must be past checkout noon
        if (!isAfterCheckoutNoonBRT(r.checkOut, now)) return false;

        // Must not be already reviewed
        if (r.stayReview && r.stayReview.state !== 'pending') return false;

        return true;
    });
}

/**
 * Appends a line to internal notes without overwriting existing content.
 * 
 * @param existing - Existing notes (may be undefined)
 * @param line - Line to append (will be timestamped)
 * @param timestamp - Optional ISO timestamp (defaults to now)
 * @returns Updated notes string
 */
export function appendInternalNote(
    existing: string | undefined,
    line: string,
    timestamp?: string
): string {
    const ts = timestamp || new Date().toISOString().slice(0, 10);
    const entry = `[${ts}] ${line}`;

    if (existing && existing.trim()) {
        return `${existing}\n${entry}`;
    }
    return entry;
}
