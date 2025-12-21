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

// ============================================================
// Rooms-based Occupancy
// ============================================================

/**
 * Maximum rooms for capacity calculation.
 * Used to determine "fully booked" state.
 */
export const MAX_ROOMS = 3;

/**
 * Checks if a date string is within a reservation's stay period.
 * A reservation covers nights from checkIn to checkOut-1.
 *
 * For example, checkIn=2025-01-15, checkOut=2025-01-18 covers:
 * - Night of 2025-01-15
 * - Night of 2025-01-16
 * - Night of 2025-01-17
 *
 * @param dateStr - Date to check ("YYYY-MM-DD")
 * @param checkIn - Reservation check-in date
 * @param checkOut - Reservation check-out date
 * @returns true if the date is within the stay period
 */
export function isDateInStayPeriod(dateStr: string, checkIn: string, checkOut: string): boolean {
    return dateStr >= checkIn && dateStr < checkOut;
}

/**
 * Represents a reservation for occupancy calculation.
 */
export interface OccupancyRecord {
    checkIn: string;
    checkOut: string;
    status?: string; // optional for v1 compat (missing = confirmed)
    rooms?: number;
}

/**
 * Calculates the number of rooms booked for each day in a month.
 *
 * RULES:
 * - Only "confirmed" status reservations count
 * - rooms defaults to 1 if missing
 * - Multi-night stays count for each night (checkIn to checkOut-1)
 * - Results are capped at maxRooms
 *
 * @param records - Array of reservation records
 * @param month - Month in "YYYY-MM" format
 * @param maxRooms - Maximum rooms to cap at (default MAX_ROOMS)
 * @returns Map from date string to booked rooms count
 */
export function getBookedRoomsByDay(
    records: OccupancyRecord[],
    month: string,
    maxRooms: number = MAX_ROOMS
): Map<string, number> {
    const bookedRooms = new Map<string, number>();

    // Parse month
    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Filter to confirmed only (missing status = confirmed for v1)
    const confirmed = records.filter((r) => !r.status || r.status === "confirmed");

    // For each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateKey(year, mon, day);
        let roomsBooked = 0;

        // Sum rooms from all confirmed reservations that cover this day
        for (const r of confirmed) {
            if (isDateInStayPeriod(dateStr, r.checkIn, r.checkOut)) {
                roomsBooked += r.rooms ?? 1;
            }
        }

        // Cap at maxRooms
        bookedRooms.set(dateStr, Math.min(roomsBooked, maxRooms));
    }

    return bookedRooms;
}

/**
 * Calculates occupancy ratio for styling intensity.
 *
 * @param bookedRooms - Number of rooms booked
 * @param maxRooms - Maximum rooms (default MAX_ROOMS)
 * @returns Ratio 0-1
 */
export function getOccupancyRatio(bookedRooms: number, maxRooms: number = MAX_ROOMS): number {
    return Math.min(1, bookedRooms / maxRooms);
}

