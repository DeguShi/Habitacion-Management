/**
 * Tests for confirmation card helpers
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { formatDateBR, formatMoneyBRL, getStatusLabel, getStatusColor } from './confirmation-card'

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

    describe('getStatusLabel', () => {
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
})
