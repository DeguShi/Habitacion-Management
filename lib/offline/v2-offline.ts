/**
 * Hybrid V2 Data Layer (Online-first with Offline fallback)
 * 
 * WHEN ONLINE: Uses API directly (original seamless behavior)
 * WHEN OFFLINE: Uses IndexedDB + outbox queue
 */

import type { ReservationV2, BookingStatus } from '@/core/entities_v2'
import { db } from './db'
import {
    createLocalReservation,
    updateLocalReservation,
    deleteLocalReservation,
    listLocalReservations,
    getLocalReservation,
    addLocalPaymentEvent,
    removeLocalPaymentEvent,
} from './data'
import { isOnline } from './network'
import { triggerSync } from './sync'

// Import original API functions for online mode
import * as apiV2 from '@/lib/data/v2'

// Re-export read functions (these go through ClientShellV2 anyway)
export { listLocalReservations as listV2Records }
export { getLocalReservation as getV2Record }

/**
 * Calculate nights between two dates
 */
function calculateNights(checkIn: string, checkOut: string): number {
    const d1 = new Date(checkIn)
    const d2 = new Date(checkOut)
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * Calculate total price
 */
function calculateTotalPrice(
    nights: number,
    partySize: number,
    nightlyRate: number,
    breakfastIncluded: boolean,
    breakfastPerPersonPerNight: number,
    manualLodgingEnabled?: boolean,
    manualLodgingTotal?: number
): number {
    const lodging = manualLodgingEnabled && manualLodgingTotal != null
        ? manualLodgingTotal
        : nights * nightlyRate * partySize
    const breakfast = breakfastIncluded
        ? nights * partySize * breakfastPerPersonPerNight
        : 0
    return lodging + breakfast
}

/**
 * Today's date in YYYY-MM-DD
 */
function todayISO(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Delete a reservation (API when online, IDB when offline)
 */
export async function deleteV2Record(id: string): Promise<void> {
    if (isOnline()) {
        // ONLINE: Use API directly, then update local cache
        await apiV2.deleteV2Record(id)
        // Also remove from local IDB
        try {
            await db.reservations.delete(id)
            await db.localMeta.delete(id)
        } catch (e) { /* ignore */ }
    } else {
        // OFFLINE: Queue for sync
        await deleteLocalReservation(id)
    }
}

/**
 * Update a reservation (API when online, IDB when offline)
 */
export async function updateV2Record(
    id: string,
    data: Partial<ReservationV2> & { id: string }
): Promise<ReservationV2> {
    if (isOnline()) {
        // ONLINE: Use API directly
        const result = await apiV2.updateV2Record(id, data)
        // Update local cache
        try {
            await db.reservations.put(result)
        } catch (e) { /* ignore */ }
        return result
    } else {
        // OFFLINE: Queue for sync
        return updateLocalReservation(id, data)
    }
}

/**
 * Input for creating waiting lead
 */
export interface CreateLeadInput {
    guestName: string
    phone?: string
    email?: string
    checkIn?: string
    checkOut?: string
    partySize?: number
    notesInternal?: string
}

/**
 * Create a waiting lead (API when online, IDB when offline)
 */
export async function createWaitingLead(input: CreateLeadInput): Promise<ReservationV2> {
    if (isOnline()) {
        // ONLINE: Use API
        const result = await apiV2.createWaitingLead(input)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }

    // OFFLINE: Use IDB
    if (!input.guestName?.trim()) throw new Error('guestName is required')
    const today = todayISO()
    let checkOut = input.checkOut
    if (input.checkIn && !checkOut) {
        const d = new Date(input.checkIn)
        d.setDate(d.getDate() + 1)
        checkOut = d.toISOString().slice(0, 10)
    }
    return createLocalReservation({
        guestName: input.guestName.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        checkIn: input.checkIn || today,
        checkOut: checkOut || today,
        partySize: input.partySize || 1,
        status: 'waiting',
        breakfastIncluded: false,
        nightlyRate: 0,
        breakfastPerPersonPerNight: 0,
        totalNights: 0,
        totalPrice: 0,
        payment: {},
        notesInternal: input.notesInternal?.trim(),
    })
}

/**
 * Input for creating confirmed reservation
 */
export interface CreateConfirmedInput {
    guestName: string
    phone?: string
    email?: string
    checkIn: string
    checkOut: string
    partySize: number
    rooms?: number
    nightlyRate?: number
    breakfastIncluded?: boolean
    breakfastPerPersonPerNight?: number
    manualLodgingEnabled?: boolean
    manualLodgingTotal?: number
    depositPaidAmount?: number
    depositMethod?: string
    depositNote?: string
    notesInternal?: string
    notesGuest?: string
    birthDate?: string
}

/**
 * Create a confirmed reservation (API when online, IDB when offline)
 */
export async function createConfirmedReservation(input: CreateConfirmedInput): Promise<ReservationV2> {
    if (isOnline()) {
        // ONLINE: Use API
        const result = await apiV2.createConfirmedReservation(input)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }

    // OFFLINE: Use IDB
    if (!input.guestName?.trim()) throw new Error('guestName is required')
    if (!input.checkIn) throw new Error('checkIn is required')
    if (!input.checkOut) throw new Error('checkOut is required')
    if (input.checkOut <= input.checkIn) throw new Error('checkOut must be after checkIn')

    const partySize = Math.max(1, input.partySize || 1)
    const rooms = Math.min(4, Math.max(1, input.rooms || 1))
    const nightlyRate = input.nightlyRate ?? 0
    const breakfastIncluded = input.breakfastIncluded ?? false
    const breakfastRate = input.breakfastPerPersonPerNight ?? (breakfastIncluded ? 30 : 0)
    const manualLodgingEnabled = input.manualLodgingEnabled ?? false
    const manualLodgingTotal = input.manualLodgingTotal

    const nights = calculateNights(input.checkIn, input.checkOut)
    const totalPrice = calculateTotalPrice(
        nights, partySize, nightlyRate, breakfastIncluded, breakfastRate,
        manualLodgingEnabled, manualLodgingTotal
    )

    const payment: Record<string, unknown> = {}
    if (input.depositPaidAmount && input.depositPaidAmount > 0) {
        payment.deposit = {
            paid: true,
            due: totalPrice * 0.5,
        }
        payment.events = [{
            id: crypto.randomUUID(),
            amount: input.depositPaidAmount,
            date: todayISO(),
            method: input.depositMethod || 'Pix',
            note: input.depositNote?.trim() || 'Depósito',
        }]
    }

    return createLocalReservation({
        guestName: input.guestName.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        partySize,
        rooms,
        nightlyRate,
        breakfastIncluded,
        breakfastPerPersonPerNight: breakfastRate,
        manualLodgingEnabled,
        manualLodgingTotal: manualLodgingEnabled ? manualLodgingTotal : undefined,
        totalNights: nights,
        totalPrice,
        status: 'confirmed',
        payment: Object.keys(payment).length > 0 ? payment : {},
        notesInternal: input.notesInternal?.trim(),
        notesGuest: input.notesGuest?.trim(),
        birthDate: input.birthDate?.trim(),
    })
}

/**
 * Input for confirming a lead
 */
export interface ConfirmLeadInput {
    checkIn: string
    checkOut: string
    partySize: number
    rooms?: number
    nightlyRate: number
    breakfastIncluded: boolean
    breakfastPerPersonPerNight: number
    manualLodgingEnabled?: boolean
    manualLodgingTotal?: number
    depositPaidAmount?: number
    depositMethod?: string
    depositNote?: string
    notesInternal?: string
    notesGuest?: string
    birthDate?: string
}

/**
 * Confirm a waiting lead (API when online, IDB when offline)
 */
export async function confirmWaitingLead(
    id: string,
    details: ConfirmLeadInput
): Promise<ReservationV2> {
    if (isOnline()) {
        // ONLINE: Use API
        const result = await apiV2.confirmWaitingLead(id, details)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }

    // OFFLINE: Use IDB
    if (!details.checkIn || !details.checkOut) throw new Error('checkIn and checkOut required')
    if (details.checkOut <= details.checkIn) throw new Error('checkOut must be after checkIn')
    const current = await getLocalReservation(id)
    if (!current) throw new Error('Record not found')

    const nights = calculateNights(details.checkIn, details.checkOut)
    const totalPrice = calculateTotalPrice(
        nights, details.partySize, details.nightlyRate,
        details.breakfastIncluded, details.breakfastPerPersonPerNight,
        details.manualLodgingEnabled, details.manualLodgingTotal
    )

    const existingEvents = current.payment?.events || []
    const newEvents = [...existingEvents]

    if (details.depositPaidAmount && details.depositPaidAmount > 0) {
        newEvents.push({
            id: crypto.randomUUID(),
            amount: details.depositPaidAmount,
            date: todayISO(),
            method: details.depositMethod || 'Pix',
            note: details.depositNote || 'Depósito',
        })
    }

    const payment = {
        ...current.payment,
        deposit: {
            ...current.payment?.deposit,
            due: totalPrice * 0.5,
            paid: (details.depositPaidAmount && details.depositPaidAmount > 0) || current.payment?.deposit?.paid || false,
        },
        events: newEvents.length > 0 ? newEvents : undefined,
    }

    return updateLocalReservation(id, {
        checkIn: details.checkIn,
        checkOut: details.checkOut,
        partySize: details.partySize,
        rooms: Math.min(4, Math.max(1, details.rooms ?? current.rooms ?? 1)),
        nightlyRate: details.nightlyRate,
        breakfastIncluded: details.breakfastIncluded,
        breakfastPerPersonPerNight: details.breakfastPerPersonPerNight,
        manualLodgingEnabled: details.manualLodgingEnabled,
        manualLodgingTotal: details.manualLodgingTotal,
        totalNights: nights,
        totalPrice,
        payment,
        notesInternal: details.notesInternal ?? current.notesInternal,
        notesGuest: details.notesGuest ?? current.notesGuest,
        birthDate: details.birthDate ?? current.birthDate,
        status: 'confirmed',
    })
}

/**
 * Add payment event (API when online, IDB when offline)
 */
export async function addPaymentEvent(
    id: string,
    event: { amount: number; date: string; method?: string; note?: string }
): Promise<ReservationV2> {
    if (isOnline()) {
        const result = await apiV2.addPaymentEvent(id, event)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }
    if (typeof event.amount !== 'number' || event.amount <= 0) {
        throw new Error('amount must be a positive number')
    }
    return addLocalPaymentEvent(id, event)
}

/**
 * Remove payment event (API when online, IDB when offline)
 */
export async function removePaymentEvent(
    id: string,
    eventId: string
): Promise<ReservationV2> {
    if (isOnline()) {
        const result = await apiV2.removePaymentEvent(id, eventId)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }
    return removeLocalPaymentEvent(id, eventId)
}

/**
 * Update record status (API when online, IDB when offline)
 */
export async function updateRecordStatus(
    id: string,
    status: BookingStatus
): Promise<ReservationV2> {
    if (isOnline()) {
        const result = await apiV2.updateRecordStatus(id, status)
        try { await db.reservations.put(result) } catch (e) { /* ignore */ }
        return result
    }
    const current = await getLocalReservation(id)
    if (!current) throw new Error('Record not found')
    return updateLocalReservation(id, { status })
}

export const confirmRecord = (id: string) => updateRecordStatus(id, 'confirmed')
export const rejectRecord = (id: string) => updateRecordStatus(id, 'rejected')
export const restoreToWaiting = (id: string) => updateRecordStatus(id, 'waiting')
