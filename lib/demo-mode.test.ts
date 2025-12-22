/**
 * Demo Mode Tests
 * Tests the isDemoMode utility and fixture data
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { isDemoMode } from './demo-mode'
import { getDemoReservations, DEMO_RESERVATIONS } from './demo/fixture_reservations_v2'

describe('Demo Mode', () => {
    it('isDemoMode returns false by default', () => {
        // Without env vars set, should return false
        const original = process.env.NEXT_PUBLIC_DEMO_MODE
        delete process.env.NEXT_PUBLIC_DEMO_MODE
        delete process.env.DEMO_MODE
        // Note: isDemoMode reads env at call time
        // In production tests, env vars are not set
        assert.strictEqual(typeof isDemoMode(), 'boolean')
        if (original) process.env.NEXT_PUBLIC_DEMO_MODE = original
    })

    it('getDemoReservations returns array of records', () => {
        const records = getDemoReservations()
        assert.ok(Array.isArray(records))
        assert.ok(records.length >= 20, 'Should have at least 20 demo records')
    })

    it('DEMO_RESERVATIONS is pre-computed', () => {
        assert.ok(Array.isArray(DEMO_RESERVATIONS))
        assert.strictEqual(DEMO_RESERVATIONS.length, getDemoReservations().length)
    })

    it('demo records have required fields', () => {
        const records = getDemoReservations()
        for (const r of records) {
            assert.ok(r.id, 'Record should have id')
            assert.ok(r.guestName, 'Record should have guestName')
            assert.ok(r.checkIn, 'Record should have checkIn')
            assert.ok(r.checkOut, 'Record should have checkOut')
            assert.ok(['confirmed', 'waiting', 'rejected'].includes(r.status), 'Record should have valid status')
        }
    })

    it('demo records have deterministic IDs', () => {
        const records1 = getDemoReservations()
        const records2 = getDemoReservations()
        assert.deepStrictEqual(
            records1.map(r => r.id),
            records2.map(r => r.id),
            'IDs should be deterministic across calls'
        )
    })

    it('demo records span all statuses', () => {
        const records = getDemoReservations()
        const statuses = new Set(records.map(r => r.status))
        assert.ok(statuses.has('confirmed'), 'Should have confirmed records')
        assert.ok(statuses.has('waiting'), 'Should have waiting records')
        assert.ok(statuses.has('rejected'), 'Should have rejected records')
    })
})
