/**
 * BirthDate Utilities
 * 
 * Storage format: DD/MM/YYYY (with slashes)
 * Display format: DD/MM/YYYY
 * Input: user types digits only (DDMMYYYY), slashes auto-inserted
 * 
 * NO new Date() parsing to avoid timezone issues.
 */

/**
 * Formats raw digit input into DD/MM/YYYY display format.
 * Used for live input formatting as user types.
 * 
 * @param raw - Raw input string (may contain non-digits)
 * @returns Formatted string with slashes (e.g., "15/03/1990")
 */
export function formatBirthInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Normalizes any valid birthDate input to DD/MM/YYYY storage format.
 * 
 * Accepts:
 * - DD/MM/YYYY — already correct
 * - DD-MM-YYYY — converts dashes to slashes
 * - DDMMYYYY (8 digits) — adds slashes
 * - YYYY-MM-DD (legacy ISO) — converts to DD/MM/YYYY
 * - Empty/undefined — returns undefined
 * 
 * @param raw - Input value
 * @returns DD/MM/YYYY string or undefined
 */
export function normalizeBirthDate(raw: unknown): string | undefined {
    if (raw == null) return undefined
    const s = String(raw).trim()
    if (!s) return undefined

    // Already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s

    // DD-MM-YYYY → DD/MM/YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        return s.replace(/-/g, '/')
    }

    // DDMMYYYY (8 digits) → DD/MM/YYYY
    if (/^\d{8}$/.test(s)) {
        return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`
    }

    // Legacy ISO YYYY-MM-DD → DD/MM/YYYY
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch
        return `${dd}/${mm}/${yyyy}`
    }

    return undefined // Invalid format
}

/**
 * Converts stored birthDate to DD/MM/YYYY display format.
 * Handles both new DD/MM/YYYY format and legacy ISO for backwards compatibility.
 * 
 * @param stored - Stored value (DD/MM/YYYY or legacy ISO)
 * @returns Display string "DD/MM/YYYY" or empty string
 */
export function formatBirthForDisplay(stored: string | undefined): string {
    if (!stored) return ''

    // Already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(stored)) {
        return stored
    }

    // Legacy ISO YYYY-MM-DD → DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        const [y, m, d] = stored.split('-')
        return `${d}/${m}/${y}`
    }

    // DDMMYYYY (8 digits) → DD/MM/YYYY
    if (/^\d{8}$/.test(stored)) {
        return `${stored.slice(0, 2)}/${stored.slice(2, 4)}/${stored.slice(4)}`
    }

    // DD-MM-YYYY → DD/MM/YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(stored)) {
        return stored.replace(/-/g, '/')
    }

    return ''
}

/**
 * Validates if a string is a valid birth date format.
 * Does NOT use Date parsing to avoid timezone issues.
 * 
 * @param s - String to validate
 * @returns true if valid DD/MM/YYYY, DDMMYYYY, DD-MM-YYYY, or ISO
 */
export function isValidBirthDate(s: string | undefined): boolean {
    if (!s) return true // blank is valid
    return /^\d{2}\/\d{2}\/\d{4}$/.test(s) ||
        /^\d{8}$/.test(s) ||
        /^\d{2}-\d{2}-\d{4}$/.test(s) ||
        /^\d{4}-\d{2}-\d{2}$/.test(s)
}
