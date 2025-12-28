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

// ============================================================
// Phase 7: Lead Creation & Confirmation Helpers
// ============================================================

/**
 * Input for creating a minimal waiting lead.
 * Only guestName is required; other fields are optional.
 */
export interface CreateLeadInput {
    guestName: string;
    phone?: string;
    email?: string;
    checkIn?: string;
    checkOut?: string;
    partySize?: number;
    notesInternal?: string;
}

/**
 * Creates a minimal waiting lead.
 * 
 * @param input - Lead data (only guestName required)
 * @returns Promise<ReservationV2>
 */
export async function createWaitingLead(input: CreateLeadInput): Promise<ReservationV2> {
    if (!input.guestName?.trim()) {
        throw new Error("guestName is required");
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Default checkOut to checkIn + 1 day if checkIn provided but not checkOut
    let checkOut = input.checkOut;
    if (input.checkIn && !checkOut) {
        const d = new Date(input.checkIn);
        d.setDate(d.getDate() + 1);
        checkOut = d.toISOString().slice(0, 10);
    }

    const payload = {
        id: crypto.randomUUID(),
        schemaVersion: 2 as const,
        guestName: input.guestName.trim(),
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        checkIn: input.checkIn || today,
        checkOut: checkOut || today,
        partySize: input.partySize || 1,
        status: "waiting" as const,
        breakfastIncluded: false,
        nightlyRate: 0,
        breakfastPerPersonPerNight: 0,
        totalNights: 0,
        totalPrice: 0,
        payment: {},
        notesInternal: input.notesInternal?.trim() || undefined,
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
        throw new Error(`Failed to create lead: ${res.status}`);
    }

    const raw = await res.json();
    return toV2(raw);
}

/**
 * Input for confirming a waiting lead.
 */
export interface ConfirmLeadInput {
    checkIn: string;
    checkOut: string;
    partySize: number;
    rooms?: number; // 1-4, default 1
    nightlyRate: number;
    breakfastIncluded: boolean;
    breakfastPerPersonPerNight: number;
    manualLodgingEnabled?: boolean;
    manualLodgingTotal?: number;
    depositPaidAmount?: number;
    depositMethod?: string;
    depositNote?: string;
    notesInternal?: string;
    notesGuest?: string;
    birthDate?: string;
}

/**
 * Calculates total nights between two dates.
 */
function calculateNights(checkIn: string, checkOut: string): number {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates total price from reservation details.
 */
function calculateTotalPrice(
    nights: number,
    partySize: number,
    nightlyRate: number,
    breakfastIncluded: boolean,
    breakfastPerPersonPerNight: number,
    manualLodgingEnabled?: boolean,
    manualLodgingTotal?: number
): number {
    const lodging = manualLodgingEnabled && manualLodgingTotal != null
        ? manualLodgingTotal
        : nights * nightlyRate * partySize;
    const breakfast = breakfastIncluded
        ? nights * partySize * breakfastPerPersonPerNight
        : 0;
    return lodging + breakfast;
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone).
 * Avoids timezone shift issues with new Date().toISOString().
 */
function todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ============================================================
// Create Confirmed Reservation
// ============================================================

/**
 * Input for creating a new confirmed reservation directly.
 */
export interface CreateConfirmedInput {
    // Guest info (required)
    guestName: string;
    phone?: string;
    email?: string;

    // Dates (required)
    checkIn: string;
    checkOut: string;

    // Occupancy
    partySize: number;
    rooms?: number; // 1-4, default 1

    // Pricing (at least one required)
    nightlyRate?: number;
    breakfastIncluded?: boolean;
    breakfastPerPersonPerNight?: number;
    manualLodgingEnabled?: boolean;
    manualLodgingTotal?: number;

    // Payment (optional)
    depositPaidAmount?: number;
    depositMethod?: string;
    depositNote?: string;

    // Notes (optional)
    notesInternal?: string;
    notesGuest?: string;

    // Personal info (optional)
    birthDate?: string;
}

/**
 * Creates a new confirmed reservation directly.
 *
 * VALIDATION:
 * - guestName required
 * - checkIn & checkOut required
 * - checkOut must be after checkIn
 * - partySize >= 1
 * - nightlyRate OR manualLodgingTotal required
 * - if breakfastIncluded, breakfastPerPersonPerNight defaults to 30
 *
 * @param input - Reservation details
 * @returns Promise<ReservationV2>
 */
export async function createConfirmedReservation(
    input: CreateConfirmedInput
): Promise<ReservationV2> {
    // Validate required fields
    if (!input.guestName?.trim()) {
        throw new Error("guestName is required");
    }
    if (!input.checkIn) {
        throw new Error("checkIn is required");
    }
    if (!input.checkOut) {
        throw new Error("checkOut is required");
    }
    if (input.checkOut <= input.checkIn) {
        throw new Error("checkOut must be after checkIn");
    }

    const partySize = Math.max(1, input.partySize || 1);
    const rooms = Math.min(4, Math.max(1, input.rooms || 1));
    const nightlyRate = input.nightlyRate ?? 0;
    const breakfastIncluded = input.breakfastIncluded ?? false;
    const breakfastRate = input.breakfastPerPersonPerNight ?? (breakfastIncluded ? 30 : 0);
    const manualLodgingEnabled = input.manualLodgingEnabled ?? false;
    const manualLodgingTotal = input.manualLodgingTotal;

    // Validate pricing
    if (!manualLodgingEnabled && nightlyRate <= 0) {
        throw new Error("nightlyRate or manualLodgingTotal is required");
    }
    if (manualLodgingEnabled && (manualLodgingTotal == null || manualLodgingTotal <= 0)) {
        throw new Error("manualLodgingTotal is required when manualLodgingEnabled is true");
    }

    // Calculate totals
    const nights = calculateNights(input.checkIn, input.checkOut);
    const totalPrice = calculateTotalPrice(
        nights,
        partySize,
        nightlyRate,
        breakfastIncluded,
        breakfastRate,
        manualLodgingEnabled,
        manualLodgingTotal
    );

    // Build payment object
    const payment: Record<string, unknown> = {};
    if (input.depositPaidAmount && input.depositPaidAmount > 0) {
        const depositDue = totalPrice * 0.5; // default 50%
        payment.deposit = {
            paid: true,
            due: depositDue,
        };
        payment.events = [
            {
                id: crypto.randomUUID(),
                amount: input.depositPaidAmount,
                date: todayISO(),
                method: input.depositMethod || "Pix",
                note: input.depositNote?.trim() || "Depósito",
            },
        ];
    }

    // Build full record
    const record = {
        guestName: input.guestName.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        partySize,
        rooms,
        nightlyRate,
        breakfastIncluded,
        breakfastPerPersonPerNight: breakfastRate,
        manualLodgingEnabled,
        manualLodgingTotal: manualLodgingEnabled ? manualLodgingTotal : undefined,
        totalNights: nights,
        totalPrice,
        status: "confirmed" as const,
        payment: Object.keys(payment).length > 0 ? payment : {},
        notesInternal: input.notesInternal?.trim(),
        notesGuest: input.notesGuest?.trim(),
        birthDate: input.birthDate?.trim(),
    };

    return createV2Record(record);
}


/**
 * Confirms a waiting lead with full details.
 * 
 * IMPORTANT: Preserves all existing fields including _importMeta and unknown keys.
 * 
 * @param id - Record ID
 * @param details - Confirmation details
 * @returns Promise<ReservationV2>
 */
export async function confirmWaitingLead(
    id: string,
    details: ConfirmLeadInput
): Promise<ReservationV2> {
    // Validate dates
    if (!details.checkIn || !details.checkOut) {
        throw new Error("checkIn and checkOut are required");
    }
    if (details.checkOut <= details.checkIn) {
        throw new Error("checkOut must be after checkIn");
    }

    // Fetch current record to preserve all fields
    const current = await getV2Record(id);

    // Calculate derived fields
    const nights = calculateNights(details.checkIn, details.checkOut);
    const totalPrice = calculateTotalPrice(
        nights,
        details.partySize,
        details.nightlyRate,
        details.breakfastIncluded,
        details.breakfastPerPersonPerNight,
        details.manualLodgingEnabled,
        details.manualLodgingTotal
    );

    // Build payment object, preserving existing events
    const existingEvents = current.payment?.events || [];
    const newEvents = [...existingEvents];

    // Add deposit payment event if amount > 0
    if (details.depositPaidAmount && details.depositPaidAmount > 0) {
        newEvents.push({
            id: crypto.randomUUID(),
            amount: details.depositPaidAmount,
            date: new Date().toISOString().slice(0, 10),
            method: details.depositMethod || "Pix",
            note: details.depositNote || "Depósito",
        });
    }

    const payment = {
        ...current.payment,
        deposit: {
            ...current.payment?.deposit,
            due: totalPrice * 0.5, // Default 50% deposit due
            paid: (details.depositPaidAmount && details.depositPaidAmount > 0) || current.payment?.deposit?.paid || false,
        },
        events: newEvents.length > 0 ? newEvents : undefined,
    };

    // Merge with current record (preserves _importMeta and unknown keys)
    const updated = {
        ...current,
        checkIn: details.checkIn,
        checkOut: details.checkOut,
        partySize: details.partySize,
        rooms: Math.min(4, Math.max(1, details.rooms ?? current.rooms ?? 1)),
        nightlyRate: details.nightlyRate,
        breakfastIncluded: details.breakfastIncluded,
        breakfastPerPersonPerNight: details.breakfastPerPersonPerNight,
        manualLodgingEnabled: details.manualLodgingEnabled,
        manualLodgingTotal: details.manualLodgingTotal,
        totalNights: nights,
        totalPrice,
        payment,
        notesInternal: details.notesInternal ?? current.notesInternal,
        notesGuest: details.notesGuest ?? current.notesGuest,
        birthDate: details.birthDate ?? current.birthDate,
        status: "confirmed" as const,
    };

    return updateV2Record(id, updated);
}

/**
 * Input for adding a payment event.
 */
export interface PaymentEventInput {
    amount: number;
    date: string;
    method?: string;
    note?: string;
}

/**
 * Adds a payment event to an existing record.
 * 
 * @param id - Record ID
 * @param event - Payment event data
 * @returns Promise<ReservationV2>
 */
export async function addPaymentEvent(
    id: string,
    event: PaymentEventInput
): Promise<ReservationV2> {
    // Validate
    if (typeof event.amount !== "number" || event.amount <= 0) {
        throw new Error("amount must be a positive number");
    }
    if (!event.date || !/^\d{4}-\d{2}-\d{2}/.test(event.date)) {
        throw new Error("date must be in ISO format (YYYY-MM-DD)");
    }

    // Fetch current record
    const current = await getV2Record(id);

    // Build new events array
    const existingEvents = current.payment?.events || [];
    const newEvent = {
        id: crypto.randomUUID(),
        amount: event.amount,
        date: event.date.slice(0, 10),
        method: event.method,
        note: event.note,
    };

    const payment = {
        ...current.payment,
        events: [...existingEvents, newEvent],
    };

    return updateV2Record(id, {
        ...current,
        payment,
    });
}

/**
 * Removes a payment event from a record.
 * 
 * @param id - Record ID
 * @param eventId - Event ID to remove
 * @returns Promise<ReservationV2>
 */
export async function removePaymentEvent(
    id: string,
    eventId: string
): Promise<ReservationV2> {
    const current = await getV2Record(id);

    const existingEvents = current.payment?.events || [];
    const filteredEvents = existingEvents.filter((e: any) => e.id !== eventId);

    const payment = {
        ...current.payment,
        events: filteredEvents.length > 0 ? filteredEvents : undefined,
    };

    return updateV2Record(id, {
        ...current,
        payment,
    });
}

