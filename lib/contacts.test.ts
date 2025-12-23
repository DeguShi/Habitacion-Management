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

// ============================================================
// Contacts Persistence for Rejected Records
// ============================================================

describe("Contacts Persistence - Rejected Records", () => {
    it("rejected records are included in contact derivation", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", status: "rejected", guestName: "Rejected Guest" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].phone, "123");
        assert.strictEqual(contacts[0].name, "Rejected Guest");
    });

    it("rejected records count toward totalBookings", () => {
        const records = [
            makeReservation({ id: "1", phone: "123", status: "confirmed" }),
            makeReservation({ id: "2", phone: "123", status: "rejected" }),
            makeReservation({ id: "3", phone: "123", status: "waiting" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].totalBookings, 3); // All 3 count
        assert.deepStrictEqual(contacts[0].reservationIds.sort(), ["1", "2", "3"]);
    });

    it("only rejected records still create a contact", () => {
        // When a lead is rejected, the guest should still be findable
        const records = [
            makeReservation({ id: "1", phone: "999", status: "rejected", guestName: "Only Rejected" }),
        ];

        const contacts = deriveContacts(records);

        assert.strictEqual(contacts.length, 1);
        assert.strictEqual(contacts[0].hasRejected, true);
        assert.strictEqual(contacts[0].hasWaiting, false);
    });
});

// ============================================================
// Search Helpers (Phase 9)
// ============================================================

import { normalizePhoneForSearch, searchContacts } from "./contacts";

describe("Search Helpers - normalizePhoneForSearch", () => {
    it("strips non-digit characters", () => {
        assert.strictEqual(normalizePhoneForSearch("+55 11 99999-9999"), "5511999999999");
    });

    it("handles empty string", () => {
        assert.strictEqual(normalizePhoneForSearch(""), "");
    });

    it("handles undefined", () => {
        assert.strictEqual(normalizePhoneForSearch(undefined), "");
    });
});

describe("Search Helpers - searchContacts", () => {
    const testContacts = [
        makeReservation({ id: "1", guestName: "João Silva", phone: "11999999999", email: "joao@test.com" }),
        makeReservation({ id: "2", guestName: "Maria Santos", phone: "22888888888", email: "maria@test.com" }),
        makeReservation({ id: "3", guestName: "Pedro Costa", phone: "33777777777" }),
    ];

    function getContacts() {
        return deriveContacts(testContacts);
    }

    it("returns all contacts for empty query", () => {
        const contacts = getContacts();
        const result = searchContacts(contacts, "");
        assert.strictEqual(result.length, contacts.length);
    });

    it("matches by name substring (case-insensitive)", () => {
        const contacts = getContacts();
        const result = searchContacts(contacts, "silva");
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].name.includes("João"));
    });

    it("matches by email substring", () => {
        const contacts = getContacts();
        const result = searchContacts(contacts, "maria@");
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].email?.includes("maria"));
    });

    it("matches phone by digits only", () => {
        const contacts = getContacts();
        const result = searchContacts(contacts, "11 999");
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].phone?.includes("11999"));
    });

    it("rejected contacts are searchable", () => {
        const records = [
            makeReservation({ id: "1", guestName: "Cancelled Guest", phone: "123", status: "rejected" }),
        ];
        const contacts = deriveContacts(records);
        const result = searchContacts(contacts, "cancelled");
        assert.strictEqual(result.length, 1);
    });
});

// ============================================================
// Best Notes Helper (Patch 9.2)
// ============================================================

import { getBestNotesForContact } from "./contacts";

describe("getBestNotesForContact", () => {
    it("returns undefined for empty array", () => {
        assert.strictEqual(getBestNotesForContact([]), undefined);
    });

    it("returns notesInternal when available", () => {
        const records = [
            makeReservation({ id: "1", notesInternal: "Dietary restrictions" }),
        ];
        assert.strictEqual(getBestNotesForContact(records), "Dietary restrictions");
    });

    it("picks most recent record with notes", () => {
        const records = [
            makeReservation({ id: "1", checkIn: "2025-01-01", notesInternal: "Old note" }),
            makeReservation({ id: "2", checkIn: "2025-03-01", notesInternal: "Recent note" }),
            makeReservation({ id: "3", checkIn: "2025-02-01", notesInternal: "Middle note" }),
        ];
        assert.strictEqual(getBestNotesForContact(records), "Recent note");
    });

    it("skips records without notes", () => {
        const records = [
            makeReservation({ id: "1", checkIn: "2025-03-01" }), // No notes
            makeReservation({ id: "2", checkIn: "2025-01-01", notesInternal: "Has notes" }),
        ];
        assert.strictEqual(getBestNotesForContact(records), "Has notes");
    });

    it("returns undefined if no records have notes", () => {
        const records = [
            makeReservation({ id: "1" }),
            makeReservation({ id: "2" }),
        ];
        assert.strictEqual(getBestNotesForContact(records), undefined);
    });
});

