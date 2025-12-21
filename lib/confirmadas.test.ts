/**
 * Unit tests for Confirmadas page helpers
 *
 * Tests the getUpcomingReservations function.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import { getUpcomingReservations } from "../app/components/v2/ConfirmadasPage";
import type { ReservationV2 } from "@/core/entities_v2";

// Helper to create a minimal v2 reservation for testing
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

describe("getUpcomingReservations", () => {
    it("filters records from today onwards", () => {
        const records = [
            makeReservation({ id: "1", checkIn: "2025-01-10" }), // past
            makeReservation({ id: "2", checkIn: "2025-01-15" }), // today
            makeReservation({ id: "3", checkIn: "2025-01-20" }), // future
        ];

        const upcoming = getUpcomingReservations(records, "2025-01-15", 10);

        assert.strictEqual(upcoming.length, 2);
        assert.ok(upcoming.find((r) => r.id === "2"));
        assert.ok(upcoming.find((r) => r.id === "3"));
        assert.ok(!upcoming.find((r) => r.id === "1")); // past excluded
    });

    it("sorts by checkIn ascending", () => {
        const records = [
            makeReservation({ id: "3", checkIn: "2025-01-30" }),
            makeReservation({ id: "1", checkIn: "2025-01-10" }),
            makeReservation({ id: "2", checkIn: "2025-01-20" }),
        ];

        const upcoming = getUpcomingReservations(records, "2025-01-01", 10);

        assert.strictEqual(upcoming[0].id, "1");
        assert.strictEqual(upcoming[1].id, "2");
        assert.strictEqual(upcoming[2].id, "3");
    });

    it("respects limit parameter", () => {
        const records = [
            makeReservation({ id: "1", checkIn: "2025-01-10" }),
            makeReservation({ id: "2", checkIn: "2025-01-20" }),
            makeReservation({ id: "3", checkIn: "2025-01-30" }),
            makeReservation({ id: "4", checkIn: "2025-02-10" }),
            makeReservation({ id: "5", checkIn: "2025-02-20" }),
        ];

        const upcoming = getUpcomingReservations(records, "2025-01-01", 3);

        assert.strictEqual(upcoming.length, 3);
        assert.strictEqual(upcoming[0].id, "1");
        assert.strictEqual(upcoming[2].id, "3");
    });

    it("returns empty array when no future records", () => {
        const records = [
            makeReservation({ id: "1", checkIn: "2025-01-01" }),
            makeReservation({ id: "2", checkIn: "2025-01-05" }),
        ];

        const upcoming = getUpcomingReservations(records, "2025-01-10", 10);

        assert.strictEqual(upcoming.length, 0);
    });

    it("returns empty array for empty input", () => {
        const upcoming = getUpcomingReservations([], "2025-01-15", 10);
        assert.strictEqual(upcoming.length, 0);
    });
});
