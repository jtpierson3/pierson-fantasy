import { describe, it, expect } from 'vitest'
import { getOpponent, getMyPoints, getTheirPoints } from './matchupHelpers'

function matchup(
    homeTeamId: string, 
    awayTeamId: string, 
    homePoints: number,
    awayPoints: number
) {
    return {
        homeTeamId,
        awayTeamId,
        homePoints,
        awayPoints,
        homeTeam: { id: homeTeamId, name: 'Home Team' },
        awayTeam: { id: awayTeamId, name: 'Away Team' }
    }
}

describe('getOpponent', () => {
    it('returns the away team when the current team is home', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getOpponent(m, 'teamA').id).toBe('teamB')
    })

    it('returns the home team when the current team is away', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getOpponent(m, 'teamB').id).toBe('teamA')
    })
})

describe('getMyPoints', () => {
    it('returns homePoints when the current team is home', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getMyPoints(m, 'teamA')).toBe(50)
    })

    it('returns awayPoints when the current team is away', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getMyPoints(m, 'teamB')).toBe(40)
    })
})

describe('getTheirPoints', () => {
    it('returns awayPoints when the current team is home', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getTheirPoints(m, 'teamA')).toBe(40)
    })

    it('returns homePoints when the current team is away', () => {
        const m = matchup('teamA', 'teamB', 50, 40)
        expect(getTheirPoints(m, 'teamB')).toBe(50)
    })
})