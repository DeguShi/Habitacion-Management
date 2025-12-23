/**
 * Unit tests for lib/normalize.ts
 *
 * Tests schema detection and v1→v2 normalization.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
    detectSchemaVersion,
    normalizeV1ToV2,
    isV2Record,
    normalizeRecord,
} from "./normalize";

describe("Schema Detection - detectSchemaVersion", () => {
    it("returns version 1 for missing schemaVersion", () => {
        const record = { id: "123", guestName: "Test" };
        const result = detectSchemaVersion(record);
        assert.strictEqual(result.version, 1);
        assert.strictEqual(result.valid, true);
    });

    it("returns version 2 for schemaVersion=2", () => {
        const record = { schemaVersion: 2, id: "123" };
        const result = detectSchemaVersion(record);
        assert.strictEqual(result.version, 2);
        assert.strictEqual(result.valid, true);
    });

    it("returns version 1 for explicit schemaVersion=1", () => {
        const record = { schemaVersion: 1, id: "123" };
        const result = detectSchemaVersion(record);
        assert.strictEqual(result.version, 1);
        assert.strictEqual(result.valid, true);
    });

    it("rejects unknown schemaVersion=3", () => {
        const record = { schemaVersion: 3, id: "123" };
        const result = detectSchemaVersion(record);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes("unsupported schemaVersion"));
    });

    it("rejects schemaVersion='2' (string instead of number)", () => {
        const record = { schemaVersion: "2", id: "123" };
        const result = detectSchemaVersion(record);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes("unsupported schemaVersion"));
    });

    it("rejects non-object input", () => {
        const result = detectSchemaVersion("not an object");
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes("not an object"));
    });

    it("rejects null input", () => {
        const result = detectSchemaVersion(null);
        assert.strictEqual(result.valid, false);
    });
});

describe("V1 to V2 Normalization - normalizeV1ToV2", () => {
    const minimalV1 = {
        id: "test-id",
        guestName: "João Silva",
        partySize: 2,
        checkIn: "2025-01-15",
        checkOut: "2025-01-18",
        breakfastIncluded: true,
        nightlyRate: 150,
        breakfastPerPersonPerNight: 25,
        totalNights: 3,
        totalPrice: 450,
        depositDue: 100,
        depositPaid: true,
        notes: "Early check-in requested",
        createdAt: "2025-01-01T10:00:00Z",
        updatedAt: "2025-01-02T15:00:00Z",
    };

    it("sets schemaVersion=2", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        assert.strictEqual(v2.schemaVersion, 2);
    });

    it("sets status=confirmed", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        assert.strictEqual(v2.status, "confirmed");
    });

    it("maps depositDue to payment.deposit.due", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        const payment = v2.payment as Record<string, unknown>;
        const deposit = payment.deposit as Record<string, unknown>;
        assert.strictEqual(deposit.due, 100);
    });

    it("maps depositPaid to payment.deposit.paid", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        const payment = v2.payment as Record<string, unknown>;
        const deposit = payment.deposit as Record<string, unknown>;
        assert.strictEqual(deposit.paid, true);
    });

    it("maps notes to notesInternal", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        assert.strictEqual(v2.notesInternal, "Early check-in requested");
        assert.strictEqual(v2.notes, undefined); // notes should not be present
    });

    it("preserves core fields", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        assert.strictEqual(v2.id, "test-id");
        assert.strictEqual(v2.guestName, "João Silva");
        assert.strictEqual(v2.partySize, 2);
        assert.strictEqual(v2.checkIn, "2025-01-15");
        assert.strictEqual(v2.checkOut, "2025-01-18");
        assert.strictEqual(v2.totalPrice, 450);
    });

    it("defaults rooms to 1 when missing", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        assert.strictEqual(v2.rooms, 1);
    });

    it("preserves rooms if present", () => {
        const v1WithRooms = { ...minimalV1, rooms: 2 };
        const v2 = normalizeV1ToV2(v1WithRooms);
        assert.strictEqual(v2.rooms, 2);
    });

    it("clamps rooms to [1,4] range", () => {
        const v1TooLow = { ...minimalV1, rooms: 0 };
        const v1TooHigh = { ...minimalV1, rooms: 10 };

        const v2Low = normalizeV1ToV2(v1TooLow);
        const v2High = normalizeV1ToV2(v1TooHigh);

        assert.strictEqual(v2Low.rooms, 1);
        assert.strictEqual(v2High.rooms, 4);
    });

    it("adds _importMeta with normalizedFrom=1", () => {
        const v2 = normalizeV1ToV2(minimalV1);
        const meta = v2._importMeta as Record<string, unknown>;
        assert.strictEqual(meta.normalizedFrom, 1);
        assert.ok(meta.normalizedAt);
    });

    it("tracks unknown keys in _importMeta.unknownKeys", () => {
        const v1WithUnknown = {
            ...minimalV1,
            customField: "custom value",
            anotherUnknown: 42,
        };
        const v2 = normalizeV1ToV2(v1WithUnknown);
        const meta = v2._importMeta as Record<string, unknown>;
        const unknownKeys = meta.unknownKeys as string[];
        assert.ok(unknownKeys.includes("customField"));
        assert.ok(unknownKeys.includes("anotherUnknown"));
        // Unknown values preserved at top level
        assert.strictEqual(v2.customField, "custom value");
        assert.strictEqual(v2.anotherUnknown, 42);
    });

    it("handles missing optional fields gracefully", () => {
        const minimal = {
            id: "min-id",
            guestName: "Min Guest",
            partySize: 1,
            checkIn: "2025-02-01",
            checkOut: "2025-02-02",
            breakfastIncluded: false,
            nightlyRate: 100,
            breakfastPerPersonPerNight: 0,
            totalNights: 1,
            totalPrice: 100,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            // No depositDue, depositPaid, notes
        };
        const v2 = normalizeV1ToV2(minimal);
        assert.strictEqual(v2.schemaVersion, 2);
        assert.strictEqual(v2.notesInternal, undefined);
        // payment should be empty object if no deposit info
        const payment = v2.payment as Record<string, unknown>;
        assert.strictEqual(payment.deposit, undefined);
    });
});

describe("isV2Record", () => {
    it("returns true for v2 record", () => {
        assert.strictEqual(isV2Record({ schemaVersion: 2 }), true);
    });

    it("returns false for v1 record", () => {
        assert.strictEqual(isV2Record({ id: "123" }), false);
    });

    it("returns false for non-object", () => {
        assert.strictEqual(isV2Record("string"), false);
        assert.strictEqual(isV2Record(null), false);
    });
});

describe("normalizeRecord", () => {
    it("normalizes v1 record", () => {
        const v1 = { id: "123", guestName: "Test", partySize: 1, checkIn: "2025-01-01", checkOut: "2025-01-02", breakfastIncluded: false, nightlyRate: 100, breakfastPerPersonPerNight: 0, totalNights: 1, totalPrice: 100, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" };
        const { normalized, wasNormalized } = normalizeRecord(v1);
        assert.strictEqual(wasNormalized, true);
        assert.strictEqual(normalized.schemaVersion, 2);
    });

    it("passes through v2 record unchanged", () => {
        const v2 = { schemaVersion: 2, id: "123", status: "waiting" };
        const { normalized, wasNormalized } = normalizeRecord(v2);
        assert.strictEqual(wasNormalized, false);
        assert.strictEqual(normalized.status, "waiting");
    });

    it("throws on unknown schemaVersion", () => {
        const bad = { schemaVersion: 99, id: "123" };
        assert.throws(() => normalizeRecord(bad), /unsupported schemaVersion/);
    });
});

// ============================================================
// Phase 9.3: v1 Deposit → v2 Payment Event Tests
// ============================================================

describe("v1 Deposit to v2 Payment Event (Phase 9.3)", () => {
    it("creates payment event when depositPaid=true and depositDue>0", () => {
        const v1 = {
            id: "test-deposit",
            guestName: "Test",
            depositPaid: true,
            depositDue: 150,
            createdAt: "2025-01-15T10:00:00Z",
        };
        const v2 = normalizeV1ToV2(v1);

        const payment = v2.payment as { events?: Array<{ id: string; amount: number; note: string }> };
        assert.ok(payment.events);
        assert.strictEqual(payment.events.length, 1);
        assert.strictEqual(payment.events[0].id, "legacy-deposit:test-deposit");
        assert.strictEqual(payment.events[0].amount, 150);
        assert.strictEqual(payment.events[0].note, "Sinal pago");
    });

    it("does NOT create event when depositPaid=false", () => {
        const v1 = {
            id: "test-no-deposit",
            guestName: "Test",
            depositPaid: false,
            depositDue: 150,
        };
        const v2 = normalizeV1ToV2(v1);

        const payment = v2.payment as { events?: unknown[] };
        assert.ok(!payment.events || payment.events.length === 0);
    });

    it("appends note when depositPaid=true but depositDue is missing", () => {
        const v1 = {
            id: "test-paid-no-amount",
            guestName: "Test",
            depositPaid: true,
            // depositDue missing
        };
        const v2 = normalizeV1ToV2(v1);

        const payment = v2.payment as { events?: unknown[] };
        assert.ok(!payment.events || payment.events.length === 0);
        assert.ok((v2.notesInternal as string)?.includes("[IMPORTADO]"));
    });

    it("appends note when depositPaid=true but depositDue=0", () => {
        const v1 = {
            id: "test-paid-zero",
            guestName: "Test",
            depositPaid: true,
            depositDue: 0,
        };
        const v2 = normalizeV1ToV2(v1);

        assert.ok((v2.notesInternal as string)?.includes("[IMPORTADO]"));
    });

    it("does NOT add duplicate events on second normalization", () => {
        const v1 = {
            id: "test-no-dupe",
            guestName: "Test",
            depositPaid: true,
            depositDue: 100,
            createdAt: "2025-01-15T10:00:00Z",
        };

        // First normalization
        const v2First = normalizeV1ToV2(v1);
        const paymentFirst = v2First.payment as { events?: unknown[] };
        assert.strictEqual(paymentFirst.events?.length, 1);

        // v2 records pass through unchanged (no synthetic event added)
        const v2Second = { ...v2First, schemaVersion: 2 } as Record<string, unknown>;
        const detection = detectSchemaVersion(v2Second);
        assert.strictEqual(detection.version, 2);
        // v2 records are not re-normalized, so no duplicate
    });

    it("v2 records are returned unchanged (no synthetic event)", () => {
        const v2Input = {
            schemaVersion: 2,
            id: "test-v2",
            guestName: "Test",
            status: "confirmed",
            payment: { deposit: { paid: true, due: 100 } },
        };
        const { normalized, wasNormalized } = normalizeRecord(v2Input);

        assert.strictEqual(wasNormalized, false);
        const payment = normalized.payment as { events?: unknown[] };
        assert.ok(!payment.events); // No synthetic event added
    });
});
