/**
 * Contact Edit Utilities
 * 
 * Provides functions for editing contact info across reservations.
 * - Updates current/future reservations directly
 * - Logs changes to past reservations in notesInternal
 */

import type { ReservationV2 } from '@/core/entities_v2'
import { formatBirthdayShort } from '@/lib/birthdays'

/**
 * Contact edit values that can be changed
 */
export interface ContactEditValues {
    name: string
    phone?: string
    email?: string
    birthDate?: string
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone)
 */
function todayISO(): string {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

/**
 * Gets today's date in DD/MM/YYYY format for logging
 */
function todayDDMMYYYY(): string {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
}

/**
 * Checks if a reservation is in the past (checkOut < today)
 */
export function isPastReservation(reservation: ReservationV2): boolean {
    const today = todayISO()
    return reservation.checkOut < today
}

/**
 * Checks if a reservation is current or future (checkOut >= today)
 */
export function isCurrentOrFutureReservation(reservation: ReservationV2): boolean {
    return !isPastReservation(reservation)
}

/**
 * Builds change log entries for differences between old and new values.
 * Returns an array of formatted log lines.
 * 
 * Format: [DD/MM/YYYY] Field Alteration: old → new
 */
export function buildContactChangeLogs(
    oldValues: ContactEditValues,
    newValues: ContactEditValues
): string[] {
    const logs: string[] = []
    const date = todayDDMMYYYY()

    // Name change
    if (oldValues.name !== newValues.name) {
        logs.push(`[${date}] Name Alteration: "${oldValues.name}" → "${newValues.name}"`)
    }

    // Phone change
    const oldPhone = oldValues.phone?.trim() || ''
    const newPhone = newValues.phone?.trim() || ''
    if (oldPhone !== newPhone) {
        logs.push(`[${date}] Phone Alteration: ${oldPhone || '(none)'} → ${newPhone || '(none)'}`)
    }

    // Email change
    const oldEmail = oldValues.email?.trim() || ''
    const newEmail = newValues.email?.trim() || ''
    if (oldEmail !== newEmail) {
        logs.push(`[${date}] Email Alteration: ${oldEmail || '(none)'} → ${newEmail || '(none)'}`)
    }

    // Birthday change
    const oldBirthDate = oldValues.birthDate?.trim() || ''
    const newBirthDate = newValues.birthDate?.trim() || ''
    if (oldBirthDate !== newBirthDate) {
        const oldDisplay = oldBirthDate ? formatBirthdayShort(oldBirthDate) : '(none)'
        const newDisplay = newBirthDate ? formatBirthdayShort(newBirthDate) : '(none)'
        logs.push(`[${date}] Birthday Alteration: ${oldDisplay} → ${newDisplay}`)
    }

    return logs
}

/**
 * Appends change logs to a reservation's notesInternal
 */
export function appendChangeLogs(
    notesInternal: string | undefined,
    logs: string[]
): string {
    if (logs.length === 0) return notesInternal || ''

    const existingNotes = notesInternal?.trim() || ''
    const logBlock = logs.join('\n')

    if (existingNotes) {
        return `${existingNotes}\n\n${logBlock}`
    }
    return logBlock
}

/**
 * Extracts contact values from a reservation
 */
export function getContactValuesFromReservation(r: ReservationV2): ContactEditValues {
    return {
        name: r.guestName,
        phone: r.phone,
        email: r.email,
        birthDate: r.birthDate,
    }
}

/**
 * Applies new contact values to a reservation record
 */
export function applyContactValuesToReservation(
    reservation: ReservationV2,
    newValues: ContactEditValues
): Partial<ReservationV2> {
    return {
        ...reservation,
        guestName: newValues.name,
        phone: newValues.phone,
        email: newValues.email,
        birthDate: newValues.birthDate,
        updatedAt: new Date().toISOString(),
    }
}

/**
 * Result of processing contact edit for a reservation
 */
export interface ContactEditResult {
    reservationId: string
    isPast: boolean
    updatedRecord: Partial<ReservationV2> & { id: string }
    logsAdded: string[]
}

/**
 * Processes a single reservation for contact edit.
 * 
 * - ALL reservations: contact fields are updated to maintain consistent grouping
 * - Past reservations: also appends change logs to notesInternal
 * 
 * @returns null if no changes needed
 */
export function processReservationForContactEdit(
    reservation: ReservationV2,
    newValues: ContactEditValues
): ContactEditResult | null {
    const oldValues = getContactValuesFromReservation(reservation)
    const logs = buildContactChangeLogs(oldValues, newValues)
    const isPast = isPastReservation(reservation)

    // No changes needed
    if (logs.length === 0) {
        return null
    }

    if (isPast) {
        // Past reservation: update contact fields AND add change logs
        const updatedRecord = applyContactValuesToReservation(reservation, newValues) as Partial<ReservationV2> & { id: string }
        updatedRecord.notesInternal = appendChangeLogs(reservation.notesInternal, logs)

        return {
            reservationId: reservation.id,
            isPast: true,
            updatedRecord,
            logsAdded: logs,
        }
    } else {
        // Current/future: update contact fields only
        return {
            reservationId: reservation.id,
            isPast: false,
            updatedRecord: applyContactValuesToReservation(reservation, newValues) as Partial<ReservationV2> & { id: string },
            logsAdded: [],
        }
    }
}
