import { describe, it, expect } from 'vitest'
import { normalizeSearchQuery, toPlayerSearchResult, MIN_SEARCH_LENGTH } from './playerSearch'

describe('normalizeSearchQuery', () => {
    it('trims surrounding whitespace', () => {
        expect(normalizeSearchQuery('  salah  ')).toBe('salah')
    })

    it('returns null for missing input', () => {
        expect(normalizeSearchQuery(null)).toBeNull()
        expect(normalizeSearchQuery(undefined)).toBeNull()
        expect(normalizeSearchQuery('')).toBeNull()
        expect(normalizeSearchQuery('     ')).toBeNull()
    })

    it('returns null when shorter than the minimum, after trimming', () => {
        expect(normalizeSearchQuery('a')).toBeNull()
        expect(normalizeSearchQuery(' a ')).toBeNull()
    })

    it('accepts exactly the minimum length', () => {
        expect(normalizeSearchQuery('a'.repeat(MIN_SEARCH_LENGTH))).toBe('a'.repeat(MIN_SEARCH_LENGTH))
    })
})

describe('toPlayerSearchResult', () => {
    const base = {
        id: 7,
        display_name: 'Test Player',
        image_path: 'https://img/p.png',
        currentClubName: 'Test FC',
    }

    it('keeps the team fields the UI reads, including leagueId', () => {
        const result = toPlayerSearchResult({
            ...base,
            team: { id: 3, name: 'Test FC', image_path: 'https://img/t.png', leagueId: 8 },
        })

        expect(result.team).toEqual({ id: 3, name: 'Test FC', image_path: 'https://img/t.png', leagueId: 8 })
    })

    it('drops fields it does not know about', () => {
        const row = {
            ...base,
            position_id: 26,
            date_of_birth: '2000-01-01',
            team: { id: 3, name: 'Test FC', image_path: null, leagueId: 8, country: 'England' },
        }

        const result = toPlayerSearchResult(row)

        expect(result).not.toHaveProperty('position_id')
        expect(result).not.toHaveProperty('date_of_birth')
        expect(result).not.toHaveProperty('country')
    })

    it('passes a null team through', () => {
        expect(toPlayerSearchResult({ ...base, team: null }).team).toBeNull()
    })
})
