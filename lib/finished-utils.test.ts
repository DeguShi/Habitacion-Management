/**
 * Tests for finished-utils.ts (Phase 9.3)
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import { isAfterCheckoutNoonBRT, getFinishedPending, appendInternalNote } from "./finished-utils";
import type { ReservationV2 } from "@/core/entities_v2";

// Helper to create a minimal v2 reservation
function makeReservation(overrides: Partial<ReservationV2> = {}): ReservationV2 {
    return {
        schemaVersion: 2,
        id: `res-${Math.random().toString(36).slice(2, 8)}`,
        guestName: "Test Guest",
        partySize: 2,
        checkIn: "2025-01-15",
        checkOut: "2025-01-18",
        status: "confirmed",
        breakfastIncluded: false,
        nightlyRate: 100,
        breakfastPerPersonPerNight: 0,
        totalNights: 3,
        totalPrice: 300,
        payment: {},
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        ...overrides,
    };
}

describe("isAfterCheckoutNoonBRT", () => {
    it("returns false for checkout today before noon", () => {
        // Create a "now" that is 10:00 on checkout date
        const checkOut = "2025-01-18";
        // Simulate 10:00 São Paulo time (13:00 UTC)
        const now = new Date("2025-01-18T13:00:00Z");
        assert.strictEqual(isAfterCheckoutNoonBRT(checkOut, now), false);
    });

    it("returns true for checkout today after noon", () => {
        const checkOut = "2025-01-18";
        // Simulate 14:00 São Paulo time (17:00 UTC)
        const now = new Date("2025-01-18T17:00:00Z");
        assert.strictEqual(isAfterCheckoutNoonBRT(checkOut, now), true);
    });

    it("returns true for checkout yesterday", () => {
        const checkOut = "2025-01-17";
        // Simulate 10:00 São Paulo time on Jan 18 (13:00 UTC)
        const now = new Date("2025-01-18T13:00:00Z");
        assert.strictEqual(isAfterCheckoutNoonBRT(checkOut, now), true);
    });

    it("returns false for future checkout", () => {
        const checkOut = "2025-01-20";
        const now = new Date("2025-01-18T17:00:00Z");
        assert.strictEqual(isAfterCheckoutNoonBRT(checkOut, now), false);
    });
});

describe("getFinishedPending", () => {
    const pastCheckout = "2025-01-15";
    const futureCheckout = "2025-01-25";
    // Simulate noon+1 on Jan 18 (15:00 UTC = 12:00 BRT + 1)
    const now = new Date("2025-01-18T17:00:00Z");

    it("includes confirmed reservations past checkout", () => {
        const records = [
            makeReservation({ id: "1", checkOut: pastCheckout, status: "confirmed" }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 1);
    });

    it("excludes future checkouts", () => {
        const records = [
            makeReservation({ id: "1", checkOut: futureCheckout, status: "confirmed" }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 0);
    });

    it("excludes waiting status", () => {
        const records = [
            makeReservation({ id: "1", checkOut: pastCheckout, status: "waiting" }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 0);
    });

    it("excludes rejected status", () => {
        const records = [
            makeReservation({ id: "1", checkOut: pastCheckout, status: "rejected" }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 0);
    });

    it("excludes already reviewed (state=ok)", () => {
        const records = [
            makeReservation({
                id: "1",
                checkOut: pastCheckout,
                status: "confirmed",
                stayReview: { state: "ok", reviewedAt: "2025-01-18T12:00:00Z" },
            }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 0);
    });

    it("excludes already reviewed (state=issue)", () => {
        const records = [
            makeReservation({
                id: "1",
                checkOut: pastCheckout,
                status: "confirmed",
                stayReview: { state: "issue", reviewedAt: "2025-01-18T12:00:00Z" },
            }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 0);
    });

    it("includes if stayReview missing (legacy)", () => {
        const records = [
            makeReservation({ id: "1", checkOut: pastCheckout, status: "confirmed" }),
        ];
        const result = getFinishedPending(records, now);
        assert.strictEqual(result.length, 1);
    });
});

describe("appendInternalNote", () => {
    it("creates new note when existing is undefined", () => {
        const result = appendInternalNote(undefined, "Test note", "2025-01-18");
        assert.strictEqual(result, "[2025-01-18] Test note");
    });

    it("appends to existing notes", () => {
        const result = appendInternalNote("Existing note", "New note", "2025-01-18");
        assert.strictEqual(result, "Existing note\n[2025-01-18] New note");
    });
});
