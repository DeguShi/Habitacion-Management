/**
 * Backup Export Utilities
 *
 * Provides functions for exporting reservations to CSV and NDJSON formats.
 * These exports are read-only and designed for backup/restore safety.
 *
 * IMPORTANT: This module only reads from storage. No writes, deletes, or modifications.
 */

import type { Reservation } from "@/core/entities";
import { listReservationKeys, getJson } from "@/lib/s3";

/**
 * All CSV columns in the required order.
 * Must match ALL fields from Reservation type in core/entities.ts.
 */
export const CSV_COLUMNS = [
    "id",
    "guestName",
    "phone",
    "email",
    "partySize",
    "checkIn",
    "checkOut",
    "breakfastIncluded",
    "nightlyRate",
    "breakfastPerPersonPerNight",
    "manualLodgingEnabled",
    "manualLodgingTotal",
    "birthDate",
    "extraSpend",
    "totalNights",
    "totalPrice",
    "depositDue",
    "depositPaid",
    "notes",
    "createdAt",
    "updatedAt",
] as const;

export type CSVColumn = (typeof CSV_COLUMNS)[number];

/**
 * Result of fetching all reservations for export.
 */
export interface ExportResult {
    reservations: Reservation[];
    keyCount: number;
    exportedCount: number;
    failedKeys: string[];
}

/**
 * Escapes a value for CSV format.
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles internal quotes
 * - Converts null/undefined to empty string
 * - Converts booleans to "true"/"false"
 */
export function escapeCSV(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    if (typeof value === "number") {
        return String(value);
    }

    const str = String(value);

    // Check if quoting is needed
    const needsQuotes = str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r");

    if (needsQuotes) {
        // Escape internal quotes by doubling them
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
    }

    return str;
}

/**
 * Converts a reservation to a CSV row string.
 * Fields are in the same order as CSV_COLUMNS.
 */
export function toCSVRow(reservation: Reservation): string {
    const values = CSV_COLUMNS.map((col) => {
        const value = reservation[col as keyof Reservation];
        return escapeCSV(value);
    });
    return values.join(",");
}

/**
 * Generates a complete CSV string from reservations.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function generateCSV(reservations: Reservation[]): string {
    const BOM = "\uFEFF"; // UTF-8 BOM for Excel
    const header = CSV_COLUMNS.join(",");
    const rows = reservations.map(toCSVRow);
    return BOM + header + "\n" + rows.join("\n");
}

/**
 * Generates NDJSON (Newline Delimited JSON) from reservations.
 * One JSON object per line, lossless.
 */
export function generateNDJSON(reservations: Reservation[]): string {
    return reservations.map((r) => JSON.stringify(r)).join("\n");
}

/**
 * Generates a timestamp string for backup filenames.
 * Format: YYYYMMDD_HHMMSS
 */
export function getBackupTimestamp(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

/**
 * Fetches all reservations for a user with controlled concurrency.
 * Uses a pool pattern to avoid overwhelming the storage backend.
 *
 * @param userId - The user's storage key (from userKeyFromEmail)
 * @param concurrency - Maximum concurrent fetch operations (default: 5)
 */
export async function fetchAllReservations(
    userId: string,
    concurrency = 5
): Promise<ExportResult> {
    const prefix = `users/${userId}/reservations/`;
    const keys = await listReservationKeys(prefix);

    const reservations: Reservation[] = [];
    const failedKeys: string[] = [];

    // Process in batches for controlled concurrency
    for (let i = 0; i < keys.length; i += concurrency) {
        const batch = keys.slice(i, i + concurrency);
        const results = await Promise.all(
            batch.map(async (key) => {
                try {
                    const data = await getJson<Reservation>(key);
                    return { key, data, success: true as const };
                } catch {
                    return { key, data: null, success: false as const };
                }
            })
        );

        for (const result of results) {
            if (result.success && result.data) {
                reservations.push(result.data);
            } else {
                failedKeys.push(result.key);
            }
        }
    }

    // Sort by checkIn then by id for deterministic ordering
    reservations.sort((a, b) => {
        const dateCompare = a.checkIn.localeCompare(b.checkIn);
        if (dateCompare !== 0) return dateCompare;
        return a.id.localeCompare(b.id);
    });

    return {
        reservations,
        keyCount: keys.length,
        exportedCount: reservations.length,
        failedKeys,
    };
}
