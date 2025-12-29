import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    formatBirthInput,
    normalizeBirthDate,
    formatBirthForDisplay,
    isValidBirthDate
} from './birthdate'

describe('formatBirthInput', () => {
    it('returns empty for empty input', () => {
        assert.equal(formatBirthInput(''), '')
    })

    it('formats 2 digits as-is', () => {
        assert.equal(formatBirthInput('15'), '15')
    })

    it('formats 4 digits with one slash', () => {
        assert.equal(formatBirthInput('1503'), '15/03')
    })

    it('formats 8 digits with two slashes', () => {
        assert.equal(formatBirthInput('15031990'), '15/03/1990')
    })

    it('strips non-digits and re-formats', () => {
        assert.equal(formatBirthInput('15/03/1990'), '15/03/1990')
        assert.equal(formatBirthInput('15-03-1990'), '15/03/1990')
    })

    it('limits to 8 digits', () => {
        assert.equal(formatBirthInput('150319901234'), '15/03/1990')
    })
})

describe('normalizeBirthDate', () => {
    it('returns undefined for null/undefined', () => {
        assert.equal(normalizeBirthDate(null), undefined)
        assert.equal(normalizeBirthDate(undefined), undefined)
    })

    it('returns undefined for empty string', () => {
        assert.equal(normalizeBirthDate(''), undefined)
        assert.equal(normalizeBirthDate('   '), undefined)
    })

    it('preserves valid DD/MM/YYYY', () => {
        assert.equal(normalizeBirthDate('15/03/1990'), '15/03/1990')
    })

    it('converts DD-MM-YYYY to DD/MM/YYYY', () => {
        assert.equal(normalizeBirthDate('15-03-1990'), '15/03/1990')
    })

    it('converts DDMMYYYY to DD/MM/YYYY', () => {
        assert.equal(normalizeBirthDate('15031990'), '15/03/1990')
    })

    it('converts legacy ISO YYYY-MM-DD to DD/MM/YYYY', () => {
        assert.equal(normalizeBirthDate('1990-03-15'), '15/03/1990')
    })

    it('returns undefined for invalid format', () => {
        assert.equal(normalizeBirthDate('not-a-date'), undefined)
        assert.equal(normalizeBirthDate('123'), undefined)
    })
})

describe('formatBirthForDisplay', () => {
    it('returns empty for undefined', () => {
        assert.equal(formatBirthForDisplay(undefined), '')
    })

    it('returns empty for empty string', () => {
        assert.equal(formatBirthForDisplay(''), '')
    })

    it('returns DD/MM/YYYY as-is', () => {
        assert.equal(formatBirthForDisplay('15/03/1990'), '15/03/1990')
    })

    it('formats legacy ISO to DD/MM/YYYY', () => {
        assert.equal(formatBirthForDisplay('1990-03-15'), '15/03/1990')
    })

    it('formats DDMMYYYY to DD/MM/YYYY', () => {
        assert.equal(formatBirthForDisplay('15031990'), '15/03/1990')
    })

    it('formats DD-MM-YYYY to DD/MM/YYYY', () => {
        assert.equal(formatBirthForDisplay('15-03-1990'), '15/03/1990')
    })
})

describe('isValidBirthDate', () => {
    it('returns true for undefined/empty', () => {
        assert.equal(isValidBirthDate(undefined), true)
        assert.equal(isValidBirthDate(''), true)
    })

    it('returns true for DD/MM/YYYY', () => {
        assert.equal(isValidBirthDate('15/03/1990'), true)
    })

    it('returns true for DDMMYYYY', () => {
        assert.equal(isValidBirthDate('15031990'), true)
    })

    it('returns true for DD-MM-YYYY', () => {
        assert.equal(isValidBirthDate('15-03-1990'), true)
    })

    it('returns true for ISO', () => {
        assert.equal(isValidBirthDate('1990-03-15'), true)
    })

    it('returns false for invalid', () => {
        assert.equal(isValidBirthDate('abc'), false)
        assert.equal(isValidBirthDate('123'), false)
    })
})
