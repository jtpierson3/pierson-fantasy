import { describe, it, expect } from 'vitest'
import { qualifiesForCleanSheet } from './scoringRules'

describe('qualifiesForCleanSheet', () => {
    it('awards a clean sheet to a player who played a full match with zero goals conceded', () => {
        expect(qualifiesForCleanSheet(0, 90)).toBe(true)
    })

    it('awards a clean sheet to a player subbed off after exactly 60 minutes', () => {
        expect(qualifiesForCleanSheet(0, 60)).toBe(true)
    })

    it('denies a clean sheet to a player subbed off before 60 minutes, even with zero goals', () => {
        expect(qualifiesForCleanSheet(0, 59)).toBe(false)
    })

    it('denies a clean sheet to everyone on a team that conceded any goal', () => {
        expect(qualifiesForCleanSheet(1, 90)).toBe(false)
    })

    it('denies a clean sheet even to a player who played all 90 if the team conceded late', () => {
        expect(qualifiesForCleanSheet(2, 90)).toBe(false)
    })
})