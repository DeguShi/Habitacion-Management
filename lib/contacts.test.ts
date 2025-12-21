/**
 * Unit tests for lib/contacts.ts
 *
 * Tests contact derivation and grouping logic.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import { deriveContacts, getContactsWithWaiting } from "./contacts";
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

describe("Contact Derivation - deriveContacts", () => {
    it("groups multiple records by same phone", () => {
        const records = [
            makeReservation({ id: "1", guestName: "João", phone: "11999999999", checkIn: "2025-01-01" }),
            makeReservation({ id: "2", guestName: "João Silva", phone: "11999999999", checkIn: "2025-02-01" }),
            makeReservation({ id: "3", guestName: "Other", phone: "22888888888", checkIn: "2025-03-01" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 2);
        const joaoContact = contacts.find((c) => c.phone === "11999999999");
        assert.ok(joaoContact);
        assert.strictEqual(joaoContact.totalBookings, 2);
        assert.deepStrictEqual(joaoContact.reservationIds.sort(), ["1", "2"]);
    });

    it("groups by email when no phone", () => {
        const records = [
            makeReservation({ id: "1", guestName: "Maria", email: "maria@test.com", checkIn: "2025-01-01" }),
            makeReservation({ id: "2", guestName: "Maria Santos", email: "maria@test.com", checkIn: "2025-02-01" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].totalBookings, 2);
        assert.strictEqual(contacts[0].email, "maria@test.com");
    });

    it("groups by name when no phone or email", () => {
        const records = [
            makeReservation({ id: "1", guestName: "Anonymous Guest", checkIn: "2025-01-01" }),
            makeReservation({ id: "2", guestName: "anonymous guest", checkIn: "2025-02-01" }), // lowercase
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].totalBookings, 2);
    });

    it("calculates correct totalBookings", () => {
        const records = [
            makeReservation({ id: "1", phone: "123" }),
            makeReservation({ id: "2", phone: "123" }),
            makeReservation({ id: "3", phone: "123" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].totalBookings, 3);
    });

    it("tracks hasWaiting flag correctly", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", status: "confirmed" }),
            makeReservation({ id: "2", phone: "123", status: "waiting" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts[0].hasWaiting, true);
    });

    it("tracks hasRejected flag correctly", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", status: "confirmed" }),
            makeReservation({ id: "2", phone: "123", status: "rejected" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts[0].hasRejected, true);
    });

    it("calculates lastStayDate as most recent", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", checkOut: "2025-01-15" }),
            makeReservation({ id: "2", phone: "123", checkOut: "2025-03-20" }),
            makeReservation({ id: "3", phone: "123", checkOut: "2025-02-10" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts[0].lastStayDate, "2025-03-20");
    });

    it("returns empty array for no records", () => {
        const contacts = deriveContacts([]);
        assert.strictEqual(contacts.length, 0);
    });

    it("sorts by lastStayDate descending", () => {
        const records = [
            makeReservation({ id: "1", phone: "111", checkOut: "2025-01-15" }),
            makeReservation({ id: "2", phone: "222", checkOut: "2025-03-20" }),
            makeReservation({ id: "3", phone: "333", checkOut: "2025-02-10" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts[0].phone, "222"); // Most recent
        assert.strictEqual(contacts[1].phone, "333");
        assert.strictEqual(contacts[2].phone, "111");
    });

    it("prefers phone grouping over email", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", email: "a@test.com" }),
            makeReservation({ id: "2", phone: "123", email: "b@test.com" }), // Same phone, different email
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].totalBookings, 2);
    });
});

describe("getContactsWithWaiting", () => {
    it("filters to only contacts with waiting items", () => {
        const records = [
            makeReservation({ id: "1", phone: "111", status: "confirmed" }),
            makeReservation({ id: "2", phone: "222", status: "waiting" }),
            makeReservation({ id: "3", phone: "333", status: "rejected" }),
        ];

        const contacts = deriveContacts(records);
        const withWaiting = getContactsWithWaiting(contacts);

        assert.strictEqual(withWaiting.length, 1);
        assert.strictEqual(withWaiting[0].phone, "222");
    });
});
