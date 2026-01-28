import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    toMMDD,
    getWeekMMDDSet,
    parseBirthDayMonth,
    isBirthdayInWeek,
    isBirthdayInRange,
    formatBirthdayShort,
    formatDDMMInput,
    isValidDDMM
} from './birthdays'

describe('toMMDD', () => {
    it('converts Jan 28 to 128', () => {
        assert.equal(toMMDD(1, 28), 128)
    })
    it('converts Dec 5 to 1205', () => {
        assert.equal(toMMDD(12, 5), 1205)
    })
    it('converts Feb 1 to 201', () => {
        assert.equal(toMMDD(2, 1), 201)
    })
})

describe('getWeekMMDDSet', () => {
    it('returns 7 keys for a week', () => {
        // Tuesday Jan 28, 2026 - week is Mon Jan 26 to Sun Feb 1
        const tue = new Date(2026, 0, 28) // Jan 28, 2026
        const keys = getWeekMMDDSet(tue)
        assert.equal(keys.size, 7)
    })

    it('contains correct days for week of Jan 28, 2026', () => {
        // Mon Jan 26 to Sun Feb 1
        const tue = new Date(2026, 0, 28)
        const keys = getWeekMMDDSet(tue)
        assert.ok(keys.has(toMMDD(1, 26))) // Mon
        assert.ok(keys.has(toMMDD(1, 27))) // Tue
        assert.ok(keys.has(toMMDD(1, 28))) // Wed
        assert.ok(keys.has(toMMDD(1, 29))) // Thu
        assert.ok(keys.has(toMMDD(1, 30))) // Fri
        assert.ok(keys.has(toMMDD(1, 31))) // Sat
        assert.ok(keys.has(toMMDD(2, 1)))  // Sun
    })

    it('handles week that spans year boundary', () => {
        // Wed Dec 30, 2026 - week is Mon Dec 28 to Sun Jan 3
        const wed = new Date(2026, 11, 30) // Dec 30
        const keys = getWeekMMDDSet(wed)
        assert.ok(keys.has(toMMDD(12, 28)))
        assert.ok(keys.has(toMMDD(12, 29)))
        assert.ok(keys.has(toMMDD(12, 30)))
        assert.ok(keys.has(toMMDD(12, 31)))
        assert.ok(keys.has(toMMDD(1, 1)))
        assert.ok(keys.has(toMMDD(1, 2)))
        assert.ok(keys.has(toMMDD(1, 3)))
    })

    it('handles Sunday correctly (last day of week)', () => {
        // Sunday Feb 1, 2026 should still be in week of Mon Jan 26
        const sun = new Date(2026, 1, 1) // Feb 1, 2026
        const keys = getWeekMMDDSet(sun)
        assert.ok(keys.has(toMMDD(1, 26)))
        assert.ok(keys.has(toMMDD(2, 1)))
    })
})

describe('parseBirthDayMonth', () => {
    it('returns null for empty input', () => {
        assert.equal(parseBirthDayMonth(''), null)
        assert.equal(parseBirthDayMonth(null), null)
        assert.equal(parseBirthDayMonth(undefined), null)
    })

    it('parses ISO format YYYY-MM-DD', () => {
        const result = parseBirthDayMonth('1990-03-15')
        assert.deepEqual(result, { day: 15, month: 3 })
    })

    it('parses DD/MM/YYYY', () => {
        const result = parseBirthDayMonth('15/03/1990')
        assert.deepEqual(result, { day: 15, month: 3 })
    })

    it('parses DD-MM-YYYY', () => {
        const result = parseBirthDayMonth('15-03-1990')
        assert.deepEqual(result, { day: 15, month: 3 })
    })

    it('returns null for invalid format', () => {
        assert.equal(parseBirthDayMonth('not-a-date'), null)
        assert.equal(parseBirthDayMonth('15031990'), null) // no separators
    })

    it('returns null for invalid month/day', () => {
        assert.equal(parseBirthDayMonth('2000-13-01'), null) // invalid month
        assert.equal(parseBirthDayMonth('2000-00-15'), null) // invalid month
    })
})

describe('isBirthdayInWeek', () => {
    it('returns true for birthday in week', () => {
        // Week of Jan 28, 2026: Mon Jan 26 to Sun Feb 1
        const weekKeys = getWeekMMDDSet(new Date(2026, 0, 28))
        assert.ok(isBirthdayInWeek('1990-01-28', weekKeys)) // Jan 28 in range
        assert.ok(isBirthdayInWeek('28/01/1990', weekKeys))
        assert.ok(isBirthdayInWeek('1985-02-01', weekKeys)) // Feb 1 in range
    })

    it('returns false for birthday outside week', () => {
        const weekKeys = getWeekMMDDSet(new Date(2026, 0, 28))
        assert.equal(isBirthdayInWeek('1990-01-25', weekKeys), false) // Jan 25 before
        assert.equal(isBirthdayInWeek('1990-02-02', weekKeys), false) // Feb 2 after
    })

    it('returns false for null/invalid birthDate', () => {
        const weekKeys = getWeekMMDDSet(new Date(2026, 0, 28))
        assert.equal(isBirthdayInWeek(null, weekKeys), false)
        assert.equal(isBirthdayInWeek('invalid', weekKeys), false)
    })
})

describe('isBirthdayInRange', () => {
    it('matches birthday in normal range', () => {
        assert.ok(isBirthdayInRange('1990-03-15', '10/03', '20/03'))
        assert.ok(isBirthdayInRange('1990-03-10', '10/03', '20/03')) // start inclusive
        assert.ok(isBirthdayInRange('1990-03-20', '10/03', '20/03')) // end inclusive
    })

    it('rejects birthday outside normal range', () => {
        assert.equal(isBirthdayInRange('1990-03-09', '10/03', '20/03'), false)
        assert.equal(isBirthdayInRange('1990-03-21', '10/03', '20/03'), false)
    })

    it('handles cross-year range (Dec to Jan)', () => {
        // 28/12 to 05/01 - includes Dec 28-31 and Jan 1-5
        assert.ok(isBirthdayInRange('1990-12-28', '28/12', '05/01'))
        assert.ok(isBirthdayInRange('1990-12-31', '28/12', '05/01'))
        assert.ok(isBirthdayInRange('1990-01-01', '28/12', '05/01'))
        assert.ok(isBirthdayInRange('1990-01-05', '28/12', '05/01'))
    })

    it('rejects birthday outside cross-year range', () => {
        assert.equal(isBirthdayInRange('1990-12-27', '28/12', '05/01'), false)
        assert.equal(isBirthdayInRange('1990-01-06', '28/12', '05/01'), false)
        assert.equal(isBirthdayInRange('1990-06-15', '28/12', '05/01'), false)
    })

    it('returns false for invalid input', () => {
        assert.equal(isBirthdayInRange(null, '10/03', '20/03'), false)
        assert.equal(isBirthdayInRange('1990-03-15', 'invalid', '20/03'), false)
    })
})

describe('formatBirthdayShort', () => {
    it('formats ISO to DD/MM', () => {
        assert.equal(formatBirthdayShort('1990-03-15'), '15/03')
    })

    it('formats DD/MM/YYYY to DD/MM', () => {
        assert.equal(formatBirthdayShort('15/03/1990'), '15/03')
    })

    it('pads single digits', () => {
        assert.equal(formatBirthdayShort('1990-01-05'), '05/01')
    })

    it('returns empty for invalid', () => {
        assert.equal(formatBirthdayShort(null), '')
        assert.equal(formatBirthdayShort('invalid'), '')
    })
})

describe('formatDDMMInput', () => {
    it('keeps 2 digits as-is', () => {
        assert.equal(formatDDMMInput('15'), '15')
    })

    it('adds slash after 2 digits', () => {
        assert.equal(formatDDMMInput('1503'), '15/03')
    })

    it('strips non-digits', () => {
        assert.equal(formatDDMMInput('15/03'), '15/03')
    })

    it('limits to 4 digits', () => {
        assert.equal(formatDDMMInput('150399'), '15/03')
    })
})

describe('isValidDDMM', () => {
    it('validates DD/MM', () => {
        assert.ok(isValidDDMM('15/03'))
        assert.ok(isValidDDMM('1/3'))
    })

    it('rejects invalid', () => {
        assert.equal(isValidDDMM(''), false)
        assert.equal(isValidDDMM('32/13'), false)
    })
})
