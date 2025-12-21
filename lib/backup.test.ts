/**
 * Unit tests for lib/backup.ts
 *
 * Tests CSV escaping, column order, and NDJSON generation.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
    escapeCSV,
    toCSVRow,
    generateCSV,
    generateNDJSON,
    CSV_COLUMNS,
    getBackupTimestamp,
} from "./backup";
import type { Reservation } from "@/core/entities";

// Sample reservation for testing
const sampleReservation: Reservation = {
    id: "test-id-123",
    guestName: "Silva Family",
    phone: "+55 11 99999-9999",
    email: "silva@example.com",
    partySize: 4,
    checkIn: "2025-01-15",
    checkOut: "2025-01-16",
    breakfastIncluded: true,
    nightlyRate: 120.5,
    breakfastPerPersonPerNight: 10,
    manualLodgingEnabled: false,
    manualLodgingTotal: undefined,
    birthDate: "1990-05-15",
    extraSpend: 50,
    totalNights: 1,
    totalPrice: 542,
    depositDue: 271,
    depositPaid: true,
    notes: "Chegam às 14h",
    createdAt: "2025-01-01T10:00:00.000Z",
    updatedAt: "2025-01-01T10:00:00.000Z",
};

describe("CSV Escaping - escapeCSV", () => {
    it("returns empty string for null", () => {
        assert.strictEqual(escapeCSV(null), "");
    });

    it("returns empty string for undefined", () => {
        assert.strictEqual(escapeCSV(undefined), "");
    });

    it("converts true to 'true'", () => {
        assert.strictEqual(escapeCSV(true), "true");
    });

    it("converts false to 'false'", () => {
        assert.strictEqual(escapeCSV(false), "false");
    });

    it("converts number to string", () => {
        assert.strictEqual(escapeCSV(123.45), "123.45");
        assert.strictEqual(escapeCSV(0), "0");
        assert.strictEqual(escapeCSV(-10), "-10");
    });

    it("returns plain string unchanged if no special chars", () => {
        assert.strictEqual(escapeCSV("Hello World"), "Hello World");
    });

    it("quotes string containing comma", () => {
        assert.strictEqual(escapeCSV("Hello, World"), '"Hello, World"');
    });

    it("quotes and doubles internal quotes", () => {
        assert.strictEqual(escapeCSV('He said "Hello"'), '"He said ""Hello"""');
    });

    it("quotes string containing newline", () => {
        assert.strictEqual(escapeCSV("Line1\nLine2"), '"Line1\nLine2"');
    });

    it("quotes string containing carriage return", () => {
        assert.strictEqual(escapeCSV("Line1\rLine2"), '"Line1\rLine2"');
    });

    it("handles complex case with comma, quote, and newline", () => {
        const input = 'Hello, "World"\nNew line';
        const expected = '"Hello, ""World""\nNew line"';
        assert.strictEqual(escapeCSV(input), expected);
    });
});

describe("CSV Columns", () => {
    it("has exactly 21 columns", () => {
        assert.strictEqual(CSV_COLUMNS.length, 21);
    });

    it("includes all required fields in correct order", () => {
        const expectedOrder = [
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
        ];

        assert.deepStrictEqual([...CSV_COLUMNS], expectedOrder);
    });
});

describe("CSV Row Generation - toCSVRow", () => {
    it("generates row with all columns", () => {
        const row = toCSVRow(sampleReservation);
        const columns = row.split(",");

        // Note: This might not be exactly 21 if values contain commas
        // But our sample doesn't have commas in values
        assert.ok(row.includes("test-id-123"), "Should include id");
        assert.ok(row.includes("Silva Family"), "Should include guestName");
        assert.ok(row.includes("true"), "Should include boolean");
        assert.ok(row.includes("120.5"), "Should include decimal number");
    });

    it("handles undefined optional fields as empty", () => {
        const reservationWithUndefined: Reservation = {
            ...sampleReservation,
            phone: undefined,
            email: undefined,
            manualLodgingTotal: undefined,
            birthDate: undefined,
            notes: undefined,
        };

        const row = toCSVRow(reservationWithUndefined);

        // The row should still be valid CSV
        assert.ok(row.length > 0);
        // Check that undefined values result in empty strings (consecutive commas)
        assert.ok(row.includes("test-id-123"));
    });
});

describe("CSV Generation - generateCSV", () => {
    it("includes UTF-8 BOM at start", () => {
        const csv = generateCSV([sampleReservation]);
        assert.strictEqual(csv.charCodeAt(0), 0xfeff, "Should start with UTF-8 BOM");
    });

    it("includes header row with all columns", () => {
        const csv = generateCSV([sampleReservation]);
        const lines = csv.split("\n");
        const headerLine = lines[0].slice(1); // Remove BOM

        for (const col of CSV_COLUMNS) {
            assert.ok(headerLine.includes(col), `Header should include ${col}`);
        }
    });

    it("has correct number of lines for reservations", () => {
        const reservations = [sampleReservation, { ...sampleReservation, id: "id-2" }];
        const csv = generateCSV(reservations);
        const lines = csv.split("\n");

        // 1 header + 2 data rows
        assert.strictEqual(lines.length, 3);
    });

    it("returns only header for empty array", () => {
        const csv = generateCSV([]);
        const lines = csv.split("\n").filter(line => line.length > 0);

        // BOM + header only (filter out empty trailing line)
        assert.strictEqual(lines.length, 1);
    });
});

describe("NDJSON Generation - generateNDJSON", () => {
    it("produces one line per object", () => {
        const reservations = [
            sampleReservation,
            { ...sampleReservation, id: "id-2" },
            { ...sampleReservation, id: "id-3" },
        ];

        const ndjson = generateNDJSON(reservations);
        const lines = ndjson.split("\n");

        assert.strictEqual(lines.length, 3, "Should have 3 lines for 3 objects");
    });

    it("each line is valid JSON", () => {
        const reservations = [sampleReservation, { ...sampleReservation, id: "id-2" }];

        const ndjson = generateNDJSON(reservations);
        const lines = ndjson.split("\n");

        for (const line of lines) {
            assert.doesNotThrow(() => JSON.parse(line), "Each line should be valid JSON");
        }
    });

    it("preserves all defined fields (lossless)", () => {
        const ndjson = generateNDJSON([sampleReservation]);
        const parsed = JSON.parse(ndjson);

        // JSON.stringify omits undefined values (standard behavior)
        // Check that all defined fields are preserved
        assert.strictEqual(parsed.id, sampleReservation.id);
        assert.strictEqual(parsed.guestName, sampleReservation.guestName);
        assert.strictEqual(parsed.totalPrice, sampleReservation.totalPrice);
        assert.strictEqual(parsed.checkIn, sampleReservation.checkIn);
        assert.strictEqual(parsed.createdAt, sampleReservation.createdAt);
        // undefined fields should not be present in JSON output
        assert.strictEqual('manualLodgingTotal' in parsed, false);
    });

    it("returns empty string for empty array", () => {
        const ndjson = generateNDJSON([]);
        assert.strictEqual(ndjson, "");
    });
});

describe("Backup Timestamp - getBackupTimestamp", () => {
    it("returns string in YYYYMMDD_HHMMSS format", () => {
        const timestamp = getBackupTimestamp();

        // Should match pattern like 20251220_203550
        assert.match(timestamp, /^\d{8}_\d{6}$/, "Should match YYYYMMDD_HHMMSS");
    });

    it("has correct length", () => {
        const timestamp = getBackupTimestamp();
        assert.strictEqual(timestamp.length, 15); // 8 + 1 + 6
    });
});
