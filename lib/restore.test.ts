/**
 * Unit tests for lib/restore.ts
 *
 * Tests NDJSON parsing, ID validation, duplicate handling, and confirmation gates.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
    isValidId,
    parseNDJSON,
    validateOverwriteConfirmation,
    MAX_FILE_SIZE_BYTES,
} from "./restore";

describe("ID Validation - isValidId", () => {
    it("accepts valid UUID-like id", () => {
        assert.strictEqual(isValidId("abc-123-def-456"), true);
    });

    it("accepts alphanumeric id", () => {
        assert.strictEqual(isValidId("reservation123"), true);
    });

    it("accepts id with underscores", () => {
        assert.strictEqual(isValidId("my_reservation_2025"), true);
    });

    it("rejects empty string", () => {
        assert.strictEqual(isValidId(""), false);
    });

    it("rejects null", () => {
        assert.strictEqual(isValidId(null), false);
    });

    it("rejects undefined", () => {
        assert.strictEqual(isValidId(undefined), false);
    });

    it("rejects number", () => {
        assert.strictEqual(isValidId(123), false);
    });

    it("rejects id containing /", () => {
        assert.strictEqual(isValidId("foo/bar"), false);
    });

    it("rejects id containing ..", () => {
        assert.strictEqual(isValidId("foo..bar"), false);
    });

    it("rejects id with path traversal attempt", () => {
        assert.strictEqual(isValidId("../../../etc/passwd"), false);
    });

    it("rejects id with spaces", () => {
        assert.strictEqual(isValidId("foo bar"), false);
    });

    it("accepts real UUID v4 format with hyphens", () => {
        // UUID v4 format: 8-4-4-4-12 hex digits
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        assert.strictEqual(isValidId(uuid), true);
    });

    it("accepts another valid UUID v4", () => {
        // Another common UUID format
        const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
        assert.strictEqual(isValidId(uuid), true);
    });
});

describe("NDJSON Parsing - parseNDJSON", () => {
    it("parses valid single line", () => {
        const content = '{"id":"abc-123","name":"Test"}';
        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 1);
        assert.strictEqual(result.parseErrorsCount, 0);
        assert.strictEqual(result.invalidRecordsCount, 0);
        assert.ok(result.validRecords.has("abc-123"));
    });

    it("parses multiple valid lines", () => {
        const content = [
            '{"id":"id1","name":"First"}',
            '{"id":"id2","name":"Second"}',
            '{"id":"id3","name":"Third"}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 3);
        assert.strictEqual(result.parseErrorsCount, 0);
    });

    it("counts parse errors for invalid JSON", () => {
        const content = [
            '{"id":"id1","name":"First"}',
            "not valid json",
            '{"id":"id2","name":"Second"}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 2);
        assert.strictEqual(result.parseErrorsCount, 1);
        assert.strictEqual(result.invalidSamples.length, 1);
        assert.strictEqual(result.invalidSamples[0].error, "invalid JSON");
    });

    it("counts invalid records for missing id", () => {
        const content = [
            '{"id":"id1","name":"First"}',
            '{"name":"No ID here"}',
            '{"id":"id2","name":"Second"}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 2);
        assert.strictEqual(result.invalidRecordsCount, 1);
        assert.ok(result.invalidSamples[0].error.includes("missing"));
    });

    it("rejects unsafe IDs with /", () => {
        const content = '{"id":"foo/bar","name":"Test"}';
        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 0);
        assert.strictEqual(result.invalidRecordsCount, 1);
        assert.ok(result.invalidSamples[0].error.includes("unsafe"));
    });

    it("handles duplicate IDs - last occurrence wins", () => {
        const content = [
            '{"id":"dup","version":1}',
            '{"id":"dup","version":2}',
            '{"id":"dup","version":3}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 1);
        assert.strictEqual(result.duplicateIdsCount, 1);
        assert.deepStrictEqual(result.duplicateSamples, ["dup"]);

        // Last occurrence wins
        const record = result.validRecords.get("dup");
        assert.ok(record);
        assert.strictEqual((record.data as Record<string, unknown>).version, 3);
    });

    it("tracks multiple duplicate IDs", () => {
        const content = [
            '{"id":"dup1","v":1}',
            '{"id":"dup2","v":1}',
            '{"id":"dup1","v":2}',
            '{"id":"dup2","v":2}',
            '{"id":"unique","v":1}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 3);
        assert.strictEqual(result.duplicateIdsCount, 2);
    });

    it("returns empty result for empty content", () => {
        const result = parseNDJSON("");

        assert.strictEqual(result.validRecords.size, 0);
        assert.strictEqual(result.records.length, 0);
    });

    it("ignores blank lines", () => {
        const content = [
            '{"id":"id1","name":"First"}',
            "",
            "   ",
            '{"id":"id2","name":"Second"}',
        ].join("\n");

        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 2);
        assert.strictEqual(result.records.length, 2);
    });

    it("limits invalid samples to 5", () => {
        const content = Array.from({ length: 10 }, () => "bad json").join("\n");
        const result = parseNDJSON(content);

        assert.strictEqual(result.parseErrorsCount, 10);
        assert.strictEqual(result.invalidSamples.length, 5);
    });

    it("rejects arrays as records", () => {
        const content = '["not", "an", "object"]';
        const result = parseNDJSON(content);

        assert.strictEqual(result.validRecords.size, 0);
        assert.strictEqual(result.invalidRecordsCount, 1);
        assert.ok(result.invalidSamples[0].error.includes("not an object"));
    });
});

describe("Overwrite Confirmation - validateOverwriteConfirmation", () => {
    it("accepts valid confirmation", () => {
        const result = validateOverwriteConfirmation("true", "OVERWRITE");
        assert.strictEqual(result.valid, true);
    });

    it("accepts boolean true", () => {
        const result = validateOverwriteConfirmation(true, "OVERWRITE");
        assert.strictEqual(result.valid, true);
    });

    it("rejects missing confirmOverwrite", () => {
        const result = validateOverwriteConfirmation(undefined, "OVERWRITE");
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes("confirmOverwrite"));
    });

    it("rejects false confirmOverwrite", () => {
        const result = validateOverwriteConfirmation("false", "OVERWRITE");
        assert.strictEqual(result.valid, false);
    });

    it("rejects wrong confirmText", () => {
        const result = validateOverwriteConfirmation("true", "overwrite");
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes("confirmText"));
    });

    it("rejects missing confirmText", () => {
        const result = validateOverwriteConfirmation("true", undefined);
        assert.strictEqual(result.valid, false);
    });

    it("rejects partial confirmText", () => {
        const result = validateOverwriteConfirmation("true", "OVERWRIT");
        assert.strictEqual(result.valid, false);
    });
});

describe("File Size Limit", () => {
    it("MAX_FILE_SIZE_BYTES is 10MB", () => {
        assert.strictEqual(MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
    });
});
