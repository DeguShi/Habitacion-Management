/**
 * Reservation V2 Schema
 *
 * This is the new canonical record shape for reservations.
 * Supports:
 * - Versioned schema (schemaVersion=2)
 * - Booking status (confirmed/waiting)
 * - Structured payment with events
 * - Split notes (internal/guest)
 *
 * MIGRATION:
 * - V1 records (no schemaVersion) are normalized to V2 on restore/export
 * - V2 records are written as-is
 */

/**
 * Booking status for reservation pipeline
 * - confirmed: Active reservation, shown in calendar
 * - waiting: On waiting list, pending confirmation
 * - rejected: Declined/archived, hidden from main views
 */
export type BookingStatus = "confirmed" | "waiting" | "rejected";

/**
 * Deposit payment tracking
 */
export interface PaymentDeposit {
    due?: number;
    paid?: boolean;
}

/**
 * Individual payment event (for future payment tracking)
 * date format: ISO 8601 (e.g., "2025-01-15" or "2025-01-15T14:30:00Z")
 */
export interface PaymentEvent {
    id?: string;    // UUID for tracking/deletion
    amount: number;
    date: string; // ISO 8601 format
    method?: string;
    note?: string;
}

/**
 * Structured payment information
 */
export interface Payment {
    deposit?: PaymentDeposit;
    terms?: string; // Free text for payment conditions
    events?: PaymentEvent[];
}

/**
 * Minimal import metadata for tracking v1→v2 normalization
 * Only stores essential info, NOT the entire v1 record
 */
export interface ImportMeta {
    normalizedFrom?: 1; // Original schema version if normalized
    normalizedAt?: string; // ISO timestamp of normalization
    unknownKeys?: string[]; // List of unknown keys that were preserved
}

/**
 * Stay review state for post-checkout review (Phase 9.3)
 * - pending: stay finished but not yet reviewed
 * - ok: stay completed successfully
 * - issue: problem occurred (didn't show up, dispute, etc.)
 */
export type StayReviewState = "pending" | "ok" | "issue";

/**
 * Stay review information (Phase 9.3)
 * Tracks whether a finished stay has been reviewed by staff
 */
export interface StayReview {
    state: StayReviewState;
    reviewedAt?: string; // ISO timestamp when reviewed
    note?: string; // Internal note about review outcome
}

/**
 * V2 Reservation Schema
 *
 * schemaVersion=2 indicates this is a v2 record.
 * Missing schemaVersion implies v1 (legacy).
 */
export interface ReservationV2 {
    schemaVersion: 2;

    id: string;
    guestName: string;
    phone?: string;
    email?: string;
    partySize: number;
    rooms?: number; // 1-4, default 1 (for occupancy calculation)

    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD

    status: BookingStatus;

    breakfastIncluded: boolean;
    nightlyRate: number;
    breakfastPerPersonPerNight: number;

    manualLodgingEnabled?: boolean;
    manualLodgingTotal?: number;

    birthDate?: string;
    extraSpend?: number;

    totalNights: number;
    totalPrice: number;

    payment: Payment;

    /**
     * Notes visible only to staff (migrated from v1 notes)
     */
    notesInternal?: string;

    /**
     * Notes intended for/from guest
     */
    notesGuest?: string;

    /**
     * Post-checkout review status (Phase 9.3)
     * Missing = pending (for backwards compat)
     */
    stayReview?: StayReview;

    createdAt: string; // ISO
    updatedAt: string; // ISO

    /**
     * Metadata about import/normalization (optional)
     * Only present if record was normalized from v1
     */
    _importMeta?: ImportMeta;
}

/**
 * Known v1 field names for detection
 */
export const V1_KNOWN_FIELDS = new Set([
    "id",
    "guestName",
    "phone",
    "email",
    "partySize",
    "rooms", // added in v2 but needs to be recognized
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
]);
