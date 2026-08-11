import { describe, it, expect } from 'vitest'
import { isPremierLeagueEligible } from './playerEligibility'
import { COMPETITIONS } from './sportmonksConstants'

describe('isPremierLeagueEligible', () => {
    it('returns true for a player on a real Premier League Club', () => {
        expect(isPremierLeagueEligible(COMPETITIONS.premier_league.leagueId)).toBe(true)
    })

    it('returns false for a player with no team at all', () => {
        expect(isPremierLeagueEligible(null)).toBe(false)
        expect(isPremierLeagueEligible(undefined)).toBe(false)
    })

    it('returns false for a Championship or foreign club, even if invloved in a tracked competition', () => {
        expect(isPremierLeagueEligible(COMPETITIONS.fa_cup.leagueId)).toBe(false)
        expect(isPremierLeagueEligible(COMPETITIONS.carabao_cup.leagueId)).toBe(false)
        expect(isPremierLeagueEligible(9999)).toBe(false) // arbitrary untracked league
    })
})