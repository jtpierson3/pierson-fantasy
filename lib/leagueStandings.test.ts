import { describe, it, expect } from 'vitest'
import { getLeagueStandings, getTeamRank } from './leagueStandings'

function team(id: string, leaguePoints: number, fantasyPoints: number) {
    return { id, totalLeaguePoints: leaguePoints, totalFantasyPoints: fantasyPoints }
}

describe('getLeagueStandings', () => {
    it('ranks teams by totalLeaguePoints descending', () => {
        const teams = [team('a', 10, 0), team('b', 30, 0), team('c', 20, 0)]

        const standings = getLeagueStandings(teams)

        expect(standings.map(s => s.team.id)).toEqual(['b', 'c', 'a'])
        expect(standings.map(s => s.rank)).toEqual([1, 2, 3])
    })

    it('uses totalFantasyPoints as a tiebreaker when league points are equal', () => {
        const teams = [team('a', 10, 100), team('b', 10, 250), team('c', 10, 50)]

        const standings = getLeagueStandings(teams)

        expect(standings.map(s => s.team.id)).toEqual(['b', 'a', 'c'])
    })

    it('does not mutate the original array', () => {
        const teams = [team('a', 10, 0), team('b', 30, 0)]
        const original = [...teams]

        getLeagueStandings(teams)

        expect(teams).toEqual(original)
    })

    describe('getTeamRank', () => {
        it('returns the correct rank for a specific team', () => {
            const teams = [team('a', 10, 0), team('b', 30, 0), team('c', 20, 0)]

            expect(getTeamRank(teams, 'b')).toBe(1)
            expect(getTeamRank(teams, 'c')).toBe(2)
            expect(getTeamRank(teams, 'a')).toBe(3)
        })

        it('returns null for a team not in the list', () => {
            const teams = [team('a', 10, 0)]
            expect(getTeamRank(teams,'nonexistent')).toBeNull()
        })
    })
})