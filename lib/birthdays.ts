/**
 * Birthday Week/Range Utilities
 * 
 * Pure functions for birthday matching using MMDD integer keys.
 * - Never uses new Date("YYYY-MM-DD") to avoid timezone issues
 * - Uses new Date(year, monthIndex, day) for safe local date construction
 * - Compares birthdays by month/day only (year-agnostic)
 */

// ============================================================
// MMDD Key Helpers
// ============================================================

/**
 * Converts month (1-12) and day (1-31) to an integer key MMDD.
 * e.g., Jan 28 → 128, Dec 5 → 1205
 */
export function toMMDD(month: number, day: number): number {
    return month * 100 + day
}

/**
 * Gets the Monday of the week containing the given date.
 * Week starts on Monday (ISO week).
 */
function getMonday(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const day = d.getDay() // 0=Sun, 1=Mon, ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day // If Sunday, go back 6 days; else go to Monday
    d.setDate(d.getDate() + diff)
    return d
}

/**
 * Returns a set of MMDD keys for all 7 days in the week containing the given date.
 * Week is Monday → Sunday in local time.
 */
export function getWeekMMDDSet(date: Date): Set<number> {
    const monday = getMonday(date)
    const keys = new Set<number>()

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
        keys.add(toMMDD(d.getMonth() + 1, d.getDate()))
    }

    return keys
}

// ============================================================
// Parsing
// ============================================================

/**
 * Extracts day and month from a birthDate string.
 * 
 * Supported formats:
 * - ISO: YYYY-MM-DD (primary storage format)
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * 
 * Returns null for invalid or empty input.
 */
export function parseBirthDayMonth(birthDate: string | undefined | null): { day: number; month: number } | null {
    if (!birthDate) return null
    const s = birthDate.trim()
    if (!s) return null

    // ISO: YYYY-MM-DD
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (isoMatch) {
        const month = parseInt(isoMatch[2], 10)
        const day = parseInt(isoMatch[3], 10)
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return { day, month }
        }
        return null
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s)
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10)
        const month = parseInt(dmyMatch[2], 10)
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return { day, month }
        }
        return null
    }

    return null
}

// ============================================================
// Birthday Detection
// ============================================================

/**
 * Checks if a birthday falls within the given week (by MMDD set membership).
 */
export function isBirthdayInWeek(birthDate: string | undefined | null, weekKeys: Set<number>): boolean {
    const parsed = parseBirthDayMonth(birthDate)
    if (!parsed) return false
    return weekKeys.has(toMMDD(parsed.month, parsed.day))
}

/**
 * Parses a DD/MM string to { day, month }.
 * Used for filter inputs.
 */
function parseDDMM(ddmm: string): { day: number; month: number } | null {
    const match = /^(\d{1,2})[\/\-](\d{1,2})$/.exec(ddmm.trim())
    if (!match) return null
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { day, month }
    }
    return null
}

/**
 * Checks if a birthday falls within a DD/MM range.
 * Handles cross-year ranges (e.g., 28/12 → 05/01).
 * 
 * Both start and end are inclusive.
 */
export function isBirthdayInRange(
    birthDate: string | undefined | null,
    startDDMM: string,
    endDDMM: string
): boolean {
    const parsed = parseBirthDayMonth(birthDate)
    if (!parsed) return false

    const start = parseDDMM(startDDMM)
    const end = parseDDMM(endDDMM)
    if (!start || !end) return false

    const bKey = toMMDD(parsed.month, parsed.day)
    const sKey = toMMDD(start.month, start.day)
    const eKey = toMMDD(end.month, end.day)

    if (sKey <= eKey) {
        // Normal range (e.g., 01/03 → 15/03)
        return bKey >= sKey && bKey <= eKey
    } else {
        // Cross-year range (e.g., 28/12 → 05/01)
        // Birthday is in range if >= start OR <= end
        return bKey >= sKey || bKey <= eKey
    }
}

// ============================================================
// Formatting
// ============================================================

/**
 * Formats a birthDate to DD/MM for display.
 * Returns empty string if invalid.
 */
export function formatBirthdayShort(birthDate: string | undefined | null): string {
    const parsed = parseBirthDayMonth(birthDate)
    if (!parsed) return ''
    const dd = String(parsed.day).padStart(2, '0')
    const mm = String(parsed.month).padStart(2, '0')
    return `${dd}/${mm}`
}

/**
 * Formats raw DD/MM input as user types.
 * Strips non-digits, auto-inserts slash after 2 digits.
 */
export function formatDDMMInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/**
 * Validates if a DD/MM string is complete and valid.
 */
export function isValidDDMM(ddmm: string): boolean {
    return parseDDMM(ddmm) !== null
}

// ============================================================
// Contact Filtering
// ============================================================

import type { Contact } from './contacts'

/**
 * Filters contacts to those with birthdays this week.
 */
export function getContactsWithBirthdayThisWeek(contacts: Contact[], now?: Date): Contact[] {
    const weekKeys = getWeekMMDDSet(now || new Date())
    return contacts.filter(c => isBirthdayInWeek(c.birthDate, weekKeys))
}

/**
 * Filters contacts by birthday range (DD/MM).
 * Returns all contacts if range is invalid or incomplete.
 */
export function filterContactsByBirthdayRange(
    contacts: Contact[],
    startDDMM: string,
    endDDMM: string
): Contact[] {
    if (!isValidDDMM(startDDMM) || !isValidDDMM(endDDMM)) {
        return contacts
    }
    return contacts.filter(c => isBirthdayInRange(c.birthDate, startDDMM, endDDMM))
}
