/**
 * Schema Normalization Utilities
 *
 * Provides functions for detecting schema version and normalizing v1 records to v2.
 *
 * DESIGN DECISIONS:
 * - schemaVersion missing → v1
 * - schemaVersion=2 → v2
 * - Unknown schemaVersion → ERROR (reject)
 * - v1 normalization maps fields to v2 structure
 * - Only unknown keys are tracked, NOT the entire v1 object (to avoid doubling size/PII)
 */

import { V1_KNOWN_FIELDS } from "@/core/entities_v2";

/**
 * Supported schema versions
 */
export type SchemaVersion = 1 | 2;

/**
 * Result of schema version detection
 */
export interface SchemaDetectionResult {
    version: SchemaVersion;
    valid: boolean;
    error?: string;
}

/**
 * Detects the schema version of a record.
 *
 * @param record - Raw record object
 * @returns SchemaDetectionResult with version, validity, and optional error
 *
 * RULES:
 * - Missing schemaVersion → v1 (legacy)
 * - schemaVersion=2 → v2
 * - Unknown schemaVersion → invalid with error
 */
export function detectSchemaVersion(record: unknown): SchemaDetectionResult {
    if (!record || typeof record !== "object") {
        return { version: 1, valid: false, error: "not an object" };
    }

    const obj = record as Record<string, unknown>;
    const schemaVersion = obj.schemaVersion;

    // Missing schemaVersion = v1 (legacy records)
    if (schemaVersion === undefined || schemaVersion === null) {
        return { version: 1, valid: true };
    }

    // Explicit v2
    if (schemaVersion === 2) {
        return { version: 2, valid: true };
    }

    // Explicit v1 (someone manually set it)
    if (schemaVersion === 1) {
        return { version: 1, valid: true };
    }

    // Unknown version - reject
    return {
        version: 1, // fallback
        valid: false,
        error: `unsupported schemaVersion: ${schemaVersion}. Expected 1, 2, or missing.`,
    };
}

/**
 * Finds keys in the record that are not in the v1 known fields list.
 */
function findUnknownKeys(v1: Record<string, unknown>): string[] {
    const unknownKeys: string[] = [];
    for (const key of Object.keys(v1)) {
        if (!V1_KNOWN_FIELDS.has(key)) {
            unknownKeys.push(key);
        }
    }
    return unknownKeys;
}

/**
 * Normalizes a v1 record to v2 format.
 *
 * MAPPINGS:
 * - schemaVersion → 2
 * - status → "confirmed" (default)
 * - depositDue → payment.deposit.due
 * - depositPaid → payment.deposit.paid
 * - depositPaid=true + depositDue>0 → payment.events[] with legacy deposit event (Phase 9.3)
 * - notes → notesReservation (reservation-specific, not inherited)
 * - Unknown keys → listed in _importMeta.unknownKeys (keys only, values preserved at top level)
 *
 * @param v1 - Raw v1 record object
 * @returns Normalized v2 record object
 */
export function normalizeV1ToV2(v1: Record<string, unknown>): Record<string, unknown> {
    const unknownKeys = findUnknownKeys(v1);

    // Build payment object from v1 deposit fields
    const payment: Record<string, unknown> = {};
    const paymentEvents: Array<Record<string, unknown>> = [];

    if (typeof v1.depositDue === "number" || typeof v1.depositPaid === "boolean") {
        payment.deposit = {};
        if (typeof v1.depositDue === "number") {
            (payment.deposit as Record<string, unknown>).due = v1.depositDue;
        }
        if (typeof v1.depositPaid === "boolean") {
            (payment.deposit as Record<string, unknown>).paid = v1.depositPaid;
        }
    }

    // Phase 9.3: Create legacy deposit payment event if depositPaid=true
    let notesAppend = "";
    if (v1.depositPaid === true) {
        const depositDue = typeof v1.depositDue === "number" ? v1.depositDue : 0;
        const recordId = typeof v1.id === "string" ? v1.id : "unknown";

        if (depositDue > 0) {
            // Create payment event with deterministic ID
            const legacyEventId = `legacy-deposit:${recordId}`;
            const createdAt = typeof v1.createdAt === "string" ? v1.createdAt : new Date().toISOString();
            const eventDate = createdAt.slice(0, 10); // YYYY-MM-DD

            paymentEvents.push({
                id: legacyEventId,
                amount: depositDue,
                date: eventDate,
                method: undefined, // unknown from v1
                note: "Sinal pago",
            });
        } else {
            // Paid but no amount - append to notes
            notesAppend = "[IMPORTADO] Sinal pago (valor não informado no v1).";
        }
    }

    if (paymentEvents.length > 0) {
        payment.events = paymentEvents;
    }

    // Build _importMeta only if normalization occurred
    const importMeta: Record<string, unknown> = {
        normalizedFrom: 1,
        normalizedAt: new Date().toISOString(),
    };
    if (unknownKeys.length > 0) {
        importMeta.unknownKeys = unknownKeys;
    }

    // Build notes (preserve existing + append if needed)
    // Copy to BOTH fields so manager can later separate them
    let notesReservation = v1.notes;
    let guestPreferences = v1.notes; // Same content initially
    if (notesAppend) {
        if (typeof notesReservation === "string" && notesReservation.trim()) {
            notesReservation = `${notesReservation}\n${notesAppend}`;
        } else {
            notesReservation = notesAppend;
        }
        // Don't append import notes to guestPreferences, only to notesReservation
    }

    // Build v2 record
    const v2: Record<string, unknown> = {
        schemaVersion: 2,

        // Core fields (copied as-is)
        id: v1.id,
        guestName: v1.guestName,
        phone: v1.phone,
        email: v1.email,
        partySize: v1.partySize,
        rooms: typeof v1.rooms === "number" ? Math.min(4, Math.max(1, v1.rooms)) : 1, // default 1, clamp 1-4
        checkIn: v1.checkIn,
        checkOut: v1.checkOut,
        breakfastIncluded: v1.breakfastIncluded,
        nightlyRate: v1.nightlyRate,
        breakfastPerPersonPerNight: v1.breakfastPerPersonPerNight,
        manualLodgingEnabled: v1.manualLodgingEnabled,
        manualLodgingTotal: v1.manualLodgingTotal,
        birthDate: v1.birthDate,
        extraSpend: v1.extraSpend,
        totalNights: v1.totalNights,
        totalPrice: v1.totalPrice,
        createdAt: v1.createdAt,
        updatedAt: v1.updatedAt,

        // New v2 fields
        status: "confirmed", // Default for migrated records
        payment,
        notesReservation, // notes → notesReservation (+ possible append)
        guestPreferences, // notes → guestPreferences (same content initially)

        // Import metadata
        _importMeta: importMeta,
    };

    // Preserve unknown keys at top level (not in _importMeta to avoid PII duplication)
    for (const key of unknownKeys) {
        v2[key] = v1[key];
    }

    // Clean up undefined values
    for (const key of Object.keys(v2)) {
        if (v2[key] === undefined) {
            delete v2[key];
        }
    }

    return v2;
}

/**
 * Checks if a record is already v2 format.
 */
export function isV2Record(record: unknown): boolean {
    if (!record || typeof record !== "object") return false;
    return (record as Record<string, unknown>).schemaVersion === 2;
}

/**
 * Migrates existing v2 records that have notesInternal to use the new fields.
 * Copies notesInternal to BOTH notesReservation and guestPreferences so the
 * manager can later separate them manually.
 */
function migrateV2NotesInternal(record: Record<string, unknown>): Record<string, unknown> {
    const notesInternal = record.notesInternal as string | undefined;

    // If no notesInternal or already migrated (has new fields), return as-is
    if (!notesInternal?.trim()) {
        return record;
    }

    // Check if already has new fields with content
    const hasNotesReservation = !!(record.notesReservation as string)?.trim();
    const hasGuestPreferences = !!(record.guestPreferences as string)?.trim();

    // If both new fields are empty, copy notesInternal to both
    if (!hasNotesReservation && !hasGuestPreferences) {
        return {
            ...record,
            notesReservation: notesInternal,
            guestPreferences: notesInternal,
            // Keep notesInternal for backward compatibility during transition
        };
    }

    // If only one field is populated, fill the other
    if (!hasNotesReservation) {
        return { ...record, notesReservation: notesInternal };
    }
    if (!hasGuestPreferences) {
        return { ...record, guestPreferences: notesInternal };
    }

    return record;
}

/**
 * Normalizes a record if it's v1, returns as-is if v2.
 * Also migrates existing v2 records with notesInternal to new fields.
 *
 * @param record - Raw record object
 * @returns { normalized: Record<string, unknown>; wasNormalized: boolean }
 * @throws Error if schemaVersion is unknown
 */
export function normalizeRecord(record: Record<string, unknown>): {
    normalized: Record<string, unknown>;
    wasNormalized: boolean;
} {
    const detection = detectSchemaVersion(record);

    if (!detection.valid) {
        throw new Error(detection.error || "Invalid record");
    }

    if (detection.version === 2) {
        // Migrate v2 records that still have notesInternal
        const migrated = migrateV2NotesInternal(record);
        const wasMigrated = migrated !== record;
        return { normalized: migrated, wasNormalized: wasMigrated };
    }

    return { normalized: normalizeV1ToV2(record), wasNormalized: true };
}
