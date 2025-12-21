/**
 * Unit tests for lib/calendar-utils.ts
 *
 * Tests calendar utilities for weekday alignment and grid generation.
 * Uses Node.js built-in test runner.
 *
 * Run with: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
    parseDateString,
    getWeekdayMondayFirst,
    getWeekdayFromString,
    generateMonthGrid,
    formatDateKey,
    WEEKDAY_LABELS,
    WEEKDAY_LABELS_EN,
} from "./calendar-utils";

describe("parseDateString", () => {
    it("parses YYYY-MM-DD without timezone shift", () => {
        const date = parseDateString("2026-02-17");
        assert.strictEqual(date.getFullYear(), 2026);
        assert.strictEqual(date.getMonth(), 1); // February = 1
        assert.strictEqual(date.getDate(), 17);
    });

    it("parses January 1st correctly", () => {
        const date = parseDateString("2024-01-01");
        assert.strictEqual(date.getFullYear(), 2024);
        assert.strictEqual(date.getMonth(), 0);
        assert.strictEqual(date.getDate(), 1);
    });

    it("parses December 31st correctly", () => {
        const date = parseDateString("2025-12-31");
        assert.strictEqual(date.getFullYear(), 2025);
        assert.strictEqual(date.getMonth(), 11);
        assert.strictEqual(date.getDate(), 31);
    });
});

describe("getWeekdayMondayFirst", () => {
    // Known dates for verification
    // 2026-02-17 is a Tuesday
    it("2026-02-17 is Tuesday (index 1)", () => {
        const date = parseDateString("2026-02-17");
        assert.strictEqual(getWeekdayMondayFirst(date), 1);
    });

    // 2025-12-25 is a Thursday
    it("2025-12-25 is Thursday (index 3)", () => {
        const date = parseDateString("2025-12-25");
        assert.strictEqual(getWeekdayMondayFirst(date), 3);
    });

    // 2026-03-01 is a Sunday
    it("2026-03-01 is Sunday (index 6)", () => {
        const date = parseDateString("2026-03-01");
        assert.strictEqual(getWeekdayMondayFirst(date), 6);
    });

    // 2024-01-01 is a Monday
    it("2024-01-01 is Monday (index 0)", () => {
        const date = parseDateString("2024-01-01");
        assert.strictEqual(getWeekdayMondayFirst(date), 0);
    });

    // 2026-02-01 is a Sunday
    it("2026-02-01 is Sunday (index 6)", () => {
        const date = parseDateString("2026-02-01");
        assert.strictEqual(getWeekdayMondayFirst(date), 6);
    });

    // 2025-12-21 is a Sunday (today per user context)
    it("2025-12-21 is Sunday (index 6)", () => {
        const date = parseDateString("2025-12-21");
        assert.strictEqual(getWeekdayMondayFirst(date), 6);
    });
});

describe("getWeekdayFromString", () => {
    it("returns Ter for 2026-02-17 (Tuesday)", () => {
        assert.strictEqual(getWeekdayFromString("2026-02-17"), "Ter");
    });

    it("returns Seg for 2024-01-01 (Monday)", () => {
        assert.strictEqual(getWeekdayFromString("2024-01-01"), "Seg");
    });

    it("returns Dom for 2026-03-01 (Sunday)", () => {
        assert.strictEqual(getWeekdayFromString("2026-03-01"), "Dom");
    });
});

describe("generateMonthGrid", () => {
    it("generates correct grid for February 2026 (starts on Sunday)", () => {
        const grid = generateMonthGrid(2026, 2);

        // Feb 2026: 28 days, starts on Sunday (index 6)
        // Grid should have 6 leading nulls, then days 1-28

        // First 6 cells should be null (Mon-Sat before Feb 1)
        assert.strictEqual(grid[0], null); // Monday
        assert.strictEqual(grid[1], null); // Tuesday
        assert.strictEqual(grid[2], null); // Wednesday
        assert.strictEqual(grid[3], null); // Thursday
        assert.strictEqual(grid[4], null); // Friday
        assert.strictEqual(grid[5], null); // Saturday
        assert.strictEqual(grid[6], 1);    // Sunday = Feb 1

        // Feb 17 should be at index 6 + 16 = 22 (17th day, 0-indexed from start)
        // Actually: 6 nulls + (17-1) = 6 + 16 = index 22
        assert.strictEqual(grid[22], 17);

        // Grid should be padded to complete weeks
        assert.strictEqual(grid.length % 7, 0);
    });

    it("generates correct grid for January 2024 (starts on Monday)", () => {
        const grid = generateMonthGrid(2024, 1);

        // Jan 2024: 31 days, starts on Monday (index 0)
        // No leading nulls needed
        assert.strictEqual(grid[0], 1); // Monday = Jan 1
        assert.strictEqual(grid[6], 7); // Sunday = Jan 7
        assert.strictEqual(grid[7], 8); // Monday = Jan 8

        assert.strictEqual(grid.length % 7, 0);
    });

    it("generates correct grid for March 2026 (starts on Sunday)", () => {
        const grid = generateMonthGrid(2026, 3);

        // March 2026: 31 days, starts on Sunday
        assert.strictEqual(grid[6], 1); // Sunday = March 1
        assert.strictEqual(grid.length % 7, 0);
    });

    it("first column (index 0, 7, 14, ...) is always Monday", () => {
        // For any month, cells at index 0, 7, 14, 21, 28 should be Mondays or nulls
        const grid = generateMonthGrid(2026, 2);

        // The day at position 7 should be a Monday (Feb 2, 2026 is Monday)
        assert.strictEqual(grid[7], 2); // Feb 2 = Monday
    });
});

describe("formatDateKey", () => {
    it("formats date correctly with zero padding", () => {
        assert.strictEqual(formatDateKey(2026, 2, 17), "2026-02-17");
        assert.strictEqual(formatDateKey(2024, 1, 1), "2024-01-01");
        assert.strictEqual(formatDateKey(2025, 12, 25), "2025-12-25");
    });
});

describe("WEEKDAY_LABELS", () => {
    it("has Monday first", () => {
        assert.strictEqual(WEEKDAY_LABELS[0], "Seg");
        assert.strictEqual(WEEKDAY_LABELS[6], "Dom");
    });

    it("has 7 labels", () => {
        assert.strictEqual(WEEKDAY_LABELS.length, 7);
    });
});

describe("WEEKDAY_LABELS_EN", () => {
    it("has Monday first", () => {
        assert.strictEqual(WEEKDAY_LABELS_EN[0], "Mo");
        assert.strictEqual(WEEKDAY_LABELS_EN[6], "Su");
    });
});
