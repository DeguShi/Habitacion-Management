/**
 * V2 Data Access Layer
 *
 * Provides typed access to reservation data with v2 normalization.
 * All reads return ReservationV2 (v1 records are normalized on-the-fly).
 *
 * Uses existing API endpoints:
 * - GET /api/reservations → list
 * - PUT /api/reservations/[id] → update
 * - POST /api/reservations → create
 */

import type { ReservationV2, BookingStatus } from "@/core/entities_v2";
import { normalizeRecord, detectSchemaVersion } from "@/lib/normalize";

/**
 * Options for listing v2 records
 */
export interface ListV2Options {
    month?: string; // "YYYY-MM" format
    status?: BookingStatus | BookingStatus[];
}

/**
 * Normalizes a raw record to v2 format.
 * Handles both v1 and v2 records safely.
 */
function toV2(raw: unknown): ReservationV2 {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid record: not an object");
    }

    const record = raw as Record<string, unknown>;
    const { normalized } = normalizeRecord(record);

    return normalized as unknown as ReservationV2;
}

/**
 * Fetches all v2 records for the current user.
 *
 * @param options - Optional filtering options
 * @returns Promise<ReservationV2[]>
 */
export async function listV2Records(options?: ListV2Options): Promise<ReservationV2[]> {
    const params = new URLSearchParams();

    if (options?.month) {
        params.set("month", options.month);
    }

    const url = `/api/reservations${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Failed to fetch records: ${res.status}`);
    }

    const rawItems: unknown[] = await res.json();

    // Normalize all records to v2
    const v2Records = rawItems.map(toV2);

    // Filter by status if specified
    if (options?.status) {
        const statuses = Array.isArray(options.status) ? options.status : [options.status];
        return v2Records.filter((r) => statuses.includes(r.status));
    }

    return v2Records;
}

/**
 * Fetches a single v2 record by ID.
 *
 * @param id - Record ID
 * @returns Promise<ReservationV2>
 */
export async function getV2Record(id: string): Promise<ReservationV2> {
    const res = await fetch(`/api/reservations/${id}`, { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Failed to fetch record ${id}: ${res.status}`);
    }

    const raw = await res.json();
    return toV2(raw);
}

/**
 * Updates a v2 record using PUT (full replacement).
 *
 * @param id - Record ID
 * @param data - Full record data to write
 * @returns Promise<ReservationV2>
 */
export async function updateV2Record(
    id: string,
    data: Partial<ReservationV2> & { id: string }
): Promise<ReservationV2> {
    // Ensure schemaVersion is set
    const payload = {
        ...data,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (res.status === 403) {
        throw new Error("Permission denied: write access required");
    }

    if (!res.ok) {
        throw new Error(`Failed to update record ${id}: ${res.status}`);
    }

    const raw = await res.json();
    return toV2(raw);
}

/**
 * Creates a new v2 record.
 *
 * @param input - Record data (id will be generated if not provided)
 * @returns Promise<ReservationV2>
 */
export async function createV2Record(
    input: Omit<ReservationV2, "id" | "schemaVersion" | "createdAt" | "updatedAt"> & {
        id?: string;
    }
): Promise<ReservationV2> {
    const now = new Date().toISOString();

    const payload = {
        ...input,
        id: input.id || crypto.randomUUID(),
        schemaVersion: 2,
        createdAt: now,
        updatedAt: now,
    };

    const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (res.status === 403) {
        throw new Error("Permission denied: write access required");
    }

    if (!res.ok) {
        throw new Error(`Failed to create record: ${res.status}`);
    }

    const raw = await res.json();
    return toV2(raw);
}

/**
 * Deletes a record by ID.
 *
 * @param id - Record ID
 * @returns Promise<void>
 */
export async function deleteV2Record(id: string): Promise<void> {
    const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
    });

    if (res.status === 403) {
        throw new Error("Permission denied: write access required");
    }

    if (!res.ok) {
        throw new Error(`Failed to delete record ${id}: ${res.status}`);
    }
}

/**
 * Updates just the status of a record (convenience method).
 * Fetches the current record, updates status, and saves.
 *
 * @param id - Record ID
 * @param status - New status
 * @returns Promise<ReservationV2>
 */
export async function updateRecordStatus(
    id: string,
    status: BookingStatus
): Promise<ReservationV2> {
    // Fetch current record
    const current = await getV2Record(id);

    // Update status
    return updateV2Record(id, {
        ...current,
        status,
    });
}

/**
 * Confirms a waiting record (sets status to "confirmed").
 */
export async function confirmRecord(id: string): Promise<ReservationV2> {
    return updateRecordStatus(id, "confirmed");
}

/**
 * Rejects a waiting record (sets status to "rejected").
 */
export async function rejectRecord(id: string): Promise<ReservationV2> {
    return updateRecordStatus(id, "rejected");
}

/**
 * Restores a rejected record back to waiting.
 */
export async function restoreToWaiting(id: string): Promise<ReservationV2> {
    return updateRecordStatus(id, "waiting");
}
