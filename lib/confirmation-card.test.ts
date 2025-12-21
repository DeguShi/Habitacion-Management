/**
 * Tests for confirmation card helpers
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
    formatDateBR,
    formatMoneyBRL,
    getStatusLabel,
    getStatusLabelES,
    getStatusColor,
    clampDevicePixelRatio,
    getDepositLabel,
    getDepositLabelES,
    formatYesNoES,
    LABELS_ES
} from './confirmation-card'

describe('Confirmation Card Helpers', () => {
    describe('formatDateBR', () => {
        it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
            assert.strictEqual(formatDateBR('2025-12-21'), '21/12/2025')
        })

        it('handles empty string', () => {
            assert.strictEqual(formatDateBR(''), '—')
        })

        it('handles undefined', () => {
            assert.strictEqual(formatDateBR(undefined as any), '—')
        })
    })

    describe('formatMoneyBRL', () => {
        it('formats positive number', () => {
            const result = formatMoneyBRL(1250.5)
            assert.ok(result.includes('1.250,50') || result.includes('1,250.50'))
        })

        it('formats zero', () => {
            const result = formatMoneyBRL(0)
            assert.ok(result.includes('0,00') || result.includes('0.00'))
        })

        it('handles null', () => {
            const result = formatMoneyBRL(null)
            assert.ok(result.includes('0,00') || result.includes('0.00'))
        })

        it('handles undefined', () => {
            const result = formatMoneyBRL(undefined)
            assert.ok(result.includes('0,00') || result.includes('0.00'))
        })
    })

    describe('getStatusLabel (PT)', () => {
        it('returns Confirmada for confirmed', () => {
            assert.strictEqual(getStatusLabel('confirmed'), 'Confirmada')
        })

        it('returns Em Espera for waiting', () => {
            assert.strictEqual(getStatusLabel('waiting'), 'Em Espera')
        })

        it('returns Cancelada for rejected', () => {
            assert.strictEqual(getStatusLabel('rejected'), 'Cancelada')
        })

        it('defaults to Confirmada for undefined', () => {
            assert.strictEqual(getStatusLabel(undefined), 'Confirmada')
        })
    })

    describe('getStatusLabelES (Spanish)', () => {
        it('returns Confirmada for confirmed', () => {
            assert.strictEqual(getStatusLabelES('confirmed'), 'Confirmada')
        })

        it('returns En espera for waiting', () => {
            assert.strictEqual(getStatusLabelES('waiting'), 'En espera')
        })

        it('returns Cancelada for rejected', () => {
            assert.strictEqual(getStatusLabelES('rejected'), 'Cancelada')
        })

        it('defaults to Confirmada for undefined', () => {
            assert.strictEqual(getStatusLabelES(undefined), 'Confirmada')
        })
    })

    describe('getStatusColor', () => {
        it('returns green for confirmed', () => {
            assert.strictEqual(getStatusColor('confirmed'), '#16a34a')
        })

        it('returns yellow for waiting', () => {
            assert.strictEqual(getStatusColor('waiting'), '#ca8a04')
        })

        it('returns red for rejected', () => {
            assert.strictEqual(getStatusColor('rejected'), '#dc2626')
        })
    })

    describe('clampDevicePixelRatio', () => {
        it('returns 1 in Node (no window)', () => {
            // In Node, window is undefined, so it returns 1
            assert.strictEqual(clampDevicePixelRatio(), 1)
        })
    })

    describe('getDepositLabel (PT)', () => {
        it('returns Pendente for undefined payment', () => {
            assert.strictEqual(getDepositLabel(undefined), 'Pendente')
        })

        it('returns Pago for deposit.paid = true', () => {
            const result = getDepositLabel({ deposit: { paid: true } } as any)
            assert.strictEqual(result, 'Pago')
        })

        it('returns Pago with amount for deposit.paid + due', () => {
            const result = getDepositLabel({ deposit: { paid: true, due: 500 } } as any)
            assert.ok(result.includes('Pago'))
            assert.ok(result.includes('500'))
        })

        it('returns Pago with sum for payment events', () => {
            const result = getDepositLabel({
                events: [{ amount: 100 }, { amount: 200 }]
            } as any)
            assert.ok(result.includes('Pago'))
            assert.ok(result.includes('300'))
        })
    })

    describe('getDepositLabelES (Spanish)', () => {
        it('returns Pendiente for undefined payment', () => {
            assert.strictEqual(getDepositLabelES(undefined), 'Pendiente')
        })

        it('returns Pagado for deposit.paid = true', () => {
            const result = getDepositLabelES({ deposit: { paid: true } } as any)
            assert.strictEqual(result, 'Pagado')
        })

        it('returns Pagado with amount for deposit.paid + due', () => {
            const result = getDepositLabelES({ deposit: { paid: true, due: 500 } } as any)
            assert.ok(result.includes('Pagado'))
            assert.ok(result.includes('500'))
        })
    })

    describe('formatYesNoES', () => {
        it('returns Sí for true', () => {
            assert.strictEqual(formatYesNoES(true), 'Sí')
        })

        it('returns No for false', () => {
            assert.strictEqual(formatYesNoES(false), 'No')
        })

        it('returns No for undefined', () => {
            assert.strictEqual(formatYesNoES(undefined), 'No')
        })
    })

    describe('LABELS_ES constants', () => {
        it('has neutral Spanish title (avoids redundancy with status)', () => {
            assert.strictEqual(LABELS_ES.title, 'Detalle de Reserva')
        })

        it('keeps Check-in/Check-out in English', () => {
            assert.strictEqual(LABELS_ES.checkIn, 'Check-in')
            assert.strictEqual(LABELS_ES.checkOut, 'Check-out')
        })

        it('has Spanish labels', () => {
            assert.strictEqual(LABELS_ES.persons, 'Personas')
            assert.strictEqual(LABELS_ES.rooms, 'Habitaciones')
            assert.strictEqual(LABELS_ES.nights, 'Noches')
            assert.strictEqual(LABELS_ES.breakfast, 'Desayuno')
        })

        it('has Spanish yes/no', () => {
            assert.strictEqual(LABELS_ES.yes, 'Sí')
            assert.strictEqual(LABELS_ES.no, 'No')
        })

        it('has Spanish status labels', () => {
            assert.strictEqual(LABELS_ES.statusWaiting, 'En espera')
            assert.strictEqual(LABELS_ES.paid, 'Pagado')
            assert.strictEqual(LABELS_ES.pending, 'Pendiente')
        })
    })
})
