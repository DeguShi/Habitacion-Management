/**
 * Calendar Utilities
 *
 * Centralized date utilities for calendar display.
 * Ensures consistent weekday alignment across the application.
 *
 * DESIGN DECISIONS:
 * - Monday is the first day of the week (index 0)
 * - Date strings ("YYYY-MM-DD") are parsed safely without timezone shifts
 * - All calculations use local timezone for display consistency
 */

/**
 * Weekday labels with Monday first (European/ISO standard).
 */
export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

/**
 * Short English weekday labels with Monday first.
 */
export const WEEKDAY_LABELS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/**
 * Parses a "YYYY-MM-DD" string safely without timezone shift.
 *
 * IMPORTANT: Using `new Date("2026-02-17")` treats it as UTC midnight,
 * which can shift to the previous day in negative timezones.
 *
 * This function creates the date in local timezone to avoid that issue.
 *
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Date object at local midnight
 */
export function parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Gets the weekday index with Monday = 0, Sunday = 6.
 *
 * JavaScript's getDay() returns Sunday = 0, Monday = 1, etc.
 * This converts it to Monday-first format.
 *
 * @param date - Date object
 * @returns Weekday index (0 = Monday, 6 = Sunday)
 */
export function getWeekdayMondayFirst(date: Date): number {
    const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return (jsDay + 6) % 7; // Convert: Sunday(0) -> 6, Monday(1) -> 0, etc.
}

/**
 * Gets the weekday name for a date (Monday-first).
 *
 * @param date - Date object
 * @returns Weekday label (e.g., "Seg" for Monday)
 */
export function getWeekdayName(date: Date): string {
    return WEEKDAY_LABELS[getWeekdayMondayFirst(date)];
}

/**
 * Gets the weekday name from a "YYYY-MM-DD" string.
 *
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Weekday label (e.g., "Ter" for Tuesday)
 */
export function getWeekdayFromString(dateStr: string): string {
    return getWeekdayName(parseDateString(dateStr));
}

/**
 * Generates a month grid for calendar display.
 *
 * Returns an array where:
 * - Each element is either a day number (1-31) or null (empty cell)
 * - Index 0-6 of each week row corresponds to Monday-Sunday
 * - Leading nulls pad the first week to align the first day correctly
 * - Trailing nulls pad the last week to complete the grid
 *
 * @param year - Full year (e.g., 2026)
 * @param month - Month number (1-12)
 * @returns Array of (number | null) for grid display
 */
export function generateMonthGrid(year: number, month: number): (number | null)[] {
    // First day of the month
    const firstDay = new Date(year, month - 1, 1);
    const startDow = getWeekdayMondayFirst(firstDay);

    // Days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build grid: leading nulls + day numbers
    const grid: (number | null)[] = [];

    // Add leading nulls for days before the first
    for (let i = 0; i < startDow; i++) {
        grid.push(null);
    }

    // Add day numbers
    for (let day = 1; day <= daysInMonth; day++) {
        grid.push(day);
    }

    // Pad to complete the last week
    while (grid.length % 7 !== 0) {
        grid.push(null);
    }

    return grid;
}

/**
 * Formats a date key for lookup: "YYYY-MM-DD"
 *
 * @param year - Full year
 * @param month - Month (1-12)
 * @param day - Day (1-31)
 * @returns Formatted date string
 */
export function formatDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
