import { describe, it, expect } from 'vitest'
import { getTeamGoalsConceded } from './goalsConceded'

const fixture = { homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 1 }

describe('getTeamGoalsConceded', () => {
    it('home player concedes the away score', () => {
        expect(getTeamGoalsConceded({ matchTeamId: 1, fallbackTeamId: null, fixture })).toBe(1)
    })

    it('away player concedes the home score', () => {
        expect(getTeamGoalsConceded({ matchTeamId: 2, fallbackTeamId: null, fixture })).toBe(3)
    })

    it('prefers the match team over the current club for a player who has since moved', () => {
        expect(getTeamGoalsConceded({ matchTeamId: 1, fallbackTeamId: 2, fixture })).toBe(1)
    })

    it('falls back to current club for rows without a match team', () => {
        expect(getTeamGoalsConceded({ matchTeamId: null, fallbackTeamId: 2, fixture })).toBe(3)
    })

    it('returns null when the player has no team at all', () => {
        expect(getTeamGoalsConceded({ matchTeamId: null, fallbackTeamId: null, fixture })).toBeNull()
    })

    it('never matches a null side (untracked opponent) to a player with no club', () => {
        const cupFixture = { homeTeamId: null, awayTeamId: 2, homeScore: 0, awayScore: 2 }
        expect(getTeamGoalsConceded({ matchTeamId: null, fallbackTeamId: 2, fixture: cupFixture })).toBeNull()
    })

    it('still resolves the tracked side when the other side is untracked', () => {
        const cupFixture = { homeTeamId: null, awayTeamId: 2, homeScore: 0, awayScore: 2 }
        expect(getTeamGoalsConceded({ matchTeamId: null, fallbackTeamId: 2, fixture: cupFixture })).toBe(0)
    })

    it('returns null when the team is on neither side', () => {
        expect(getTeamGoalsConceded({ matchTeamId: 99, fallbackTeamId: null, fixture })).toBeNull()
    })

    it('treats a missing score as 0 conceded', () => {
        const unscored = { homeTeamId: 1, awayTeamId: 2, homeScore: null, awayScore: null }
        expect(getTeamGoalsConceded({ matchTeamId: 1, fallbackTeamId: null, fixture: unscored })).toBe(0)
    })
})