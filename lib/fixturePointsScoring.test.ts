import { describe, it, expect } from 'vitest'
import { groupRulesByPosition, scorePlayerMatchStats } from './fixturePointsScoring'

const dbRule = (position: string, over: Record<string, unknown> = {}) => ({
    statKey: 'CLEAN_SHEET',
    displayName: 'Clean Sheet',
    statTypeId: null,
    position,
    pointsPerUnit: 4,
    isGraduated: false,
    tiers: null,
    ...over,
})

const rulesByPosition = groupRulesByPosition([
    dbRule('GK'),
    dbRule('DEF'),
    dbRule('ST', { statKey: 'GOAL', displayName: 'Goal', statTypeId: 52, pointsPerUnit: 9 }),
])

const fixture = { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }

const base = {
    positionPlayedId: 24,
    matchTeamId: 1,
    playerClubId: 1,
    fixture,
    stats: {},
    rating: 7,
    minutesPlayed: 90,
    rulesByPosition,
}

describe('groupRulesByPosition', () => {
    it('groups rules by position', () => {
        expect(rulesByPosition.get('GK')).toHaveLength(1)
        expect(rulesByPosition.get('ST')).toHaveLength(1)
        expect(rulesByPosition.get('WM')).toBeUndefined()
    })
})

describe('scorePlayerMatchStats', () => {
    it('treats positionPlayedId 24 as a goalkeeper and awards a clean sheet', () => {
        const r = scorePlayerMatchStats(base)
        expect(r).toMatchObject({ scored: true, scoringPosition: 'GK', totalPoints: 7 + 4, sideUnknown: false })
    })

    it('does not score a position that does not resolve', () => {
        expect(scorePlayerMatchStats({ ...base, positionPlayedId: null })).toEqual({ scored: false })
        expect(scorePlayerMatchStats({ ...base, positionPlayedId: 999 })).toEqual({ scored: false })
    })

    it('awards no clean sheet when the side conceded', () => {
        const r = scorePlayerMatchStats({ ...base, matchTeamId: 2, playerClubId: 2 })
        expect(r).toMatchObject({ scored: true, totalPoints: 7 })
    })

    it('uses the match team over the currrent club for a mid-season mover', () => {
        const r = scorePlayerMatchStats({ ...base, matchTeamId: 1, playerClubId: 2 })
        expect(r).toMatchObject({ scored: true, totalPoints: 7 + 4 })
    })

    it('falls back to the current club when the match team was not stored', () => {
        const r = scorePlayerMatchStats({ ...base, matchTeamId: null, playerClubId: 1 })
        expect(r).toMatchObject({ scored: true, totalPoints: 7 + 4 })
    })

    it('awards no clean sheet and flags it when the side cannot be determined', () => {
        const r = scorePlayerMatchStats({ ...base, matchTeamId: null, playerClubId: null })
        expect(r).toMatchObject({ scored: true, totalPoints: 7, sideUnknown: true })
    })

    it('does not flag an unknown side for a player who did not play', () => {
        const r = scorePlayerMatchStats({ ...base, matchTeamId: null, playerClubId: null, minutesPlayed: 0 })
        expect(r).toMatchObject({ scored: true, sideUnknown: false })
    })

    it('falls back to the current club when the match team was not stored', () => {
        const r = scorePlayerMatchStats({ ...base, positionPlayedId: 27, stats: { '52': 1 } })
        expect(r).toMatchObject({ scored: true, scoringPosition: 'ST', totalPoints: 7 + 9 })
    })
})