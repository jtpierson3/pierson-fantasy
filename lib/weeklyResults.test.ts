import { describe, it, expect } from 'vitest'
import { computeWeeklyResults, WeeklyMatchup } from './weeklyResults'

const m = (homeTeamId: string, homePoints: number, awayTeamId: string, awayPoints: number): WeeklyMatchup =>
    ({ homeTeamId, homePoints, awayTeamId, awayPoints })

function byTeam(matchups: WeeklyMatchup[], teams: number) {
    return Object.fromEntries(computeWeeklyResults(matchups, teams).map(o => [o.teamId, o]))
}

describe('computeWeeklyResults', () => {
    it('awards a win and a loss when the loser is outside the top half', () => {
        const r = byTeam([m('A', 100, 'B', 60), m('C', 90, 'D', 95)], 4)
        expect(r.A.result).toBe('win')
        expect(r.D.result).toBe('win')
        expect(r.B.result).toBe('loss')
        expect(r.C.result).toBe('loss')
    })

    it('gives a draw to a matchup loser whose score is in the top half', () => {
        const r = byTeam([m('A', 100, 'B', 95), m('C', 50, 'D', 40)], 4)
        expect(r.A.result).toBe('win')
        expect(r.B.result).toBe('draw')
        expect(r.D.result).toBe('loss')
        expect(r.C.result).toBe('win')
    })

    it('treats an exact matchup tie as a draw for both teams', () => {
        const r = byTeam([m('A', 80, 'B', 80), m('C', 90, 'D', 10)], 4)
        expect(r.A.result).toBe('draw')
        expect(r.B.result).toBe('draw')
        expect(r.C.result).toBe('win')
        expect(r.D.result).toBe('loss')
    })

    it('extends the top half to include a score tied with the cutoff', () => {
        const r = byTeam([m('A', 100, 'B', 80), m('C', 80, 'D', 70)], 4)
        expect(r.A.result).toBe('win')
        expect(r.D.result).toBe('loss')
        expect(r.B.result).toBe('draw')
        expect(r.C.result).toBe('win')
    })

    it('uses the league team count for the cutoff, not just the teams that played', () => {
        const r = byTeam([m('A', 100, 'B', 90), m('C', 50, 'D', 40)], 5)
        expect(r.A.result).toBe('win')
        expect(r.D.result).toBe('loss')
        expect(r.B.result).toBe('draw')
        expect(r.C.result).toBe('win')
    })

    it('reports league points and weely score', () => {
        const r = byTeam([m('A', 100, 'B', 60), m('C', 90, 'D', 95)], 4)
        expect(r.A.leaguePoints).toBe(3)
        expect(r.B.leaguePoints).toBe(0)
        expect(r.A.score).toBe(100)
    })

    it('handles an empty week and a league too small for a top half', () => {
        expect(computeWeeklyResults([], 1)).toEqual([])
        const r = byTeam([m('A', 10, 'B', 20)], 1)
        expect(r.A.result).toBe('loss')
        expect(r.B.result).toBe('win')
    })
})