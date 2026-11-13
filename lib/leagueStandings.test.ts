import { describe, it, expect } from 'vitest'
import { getLeagueStandings, getTeamRank } from './leagueStandings'

function team(id: string, leaguePoints: number, fantasyPoints: number, draftPosition: number | null = null) {
    return { id, totalLeaguePoints: leaguePoints, totalFantasyPoints: fantasyPoints, draftPosition }
}

describe('getLeagueStandings', () => {
    it('ranks teams by totalLeaguePoints descending', () => {
        const standings = getLeagueStandings([team('a', 10, 0), team('b', 30, 0), team('c', 20, 0)])

        expect(standings.map(s => s.team.id)).toEqual(['b', 'c', 'a'])
        expect(standings.map(s => s.rank)).toEqual([1, 2, 3])
    })

    it('uses totalFantasyPoints as a tiebreaker when league points are equal', () => {
        const standings = getLeagueStandings([team('a', 10, 100), team('b', 10, 250), team('c', 10, 50)])

        expect(standings.map(s => s.team.id)).toEqual(['b', 'a', 'c'])
        expect(standings.map(s => s.rank)).toEqual([1, 2, 3])
    })

    it('does not mutate the original array', () => {
        const teams = [team('a', 10, 0), team('b', 30, 0)]
        const original = [...teams]

        getLeagueStandings(teams)

        expect(teams).toEqual(original)
    })

    it('gives teams tied on both league and fantasy points the same rank', () => {
        const standings = getLeagueStandings([
            team('a', 20, 100), team('b', 10, 50), team('c', 10, 50), team('d', 5, 10),
        ])

        expect(standings.map(s => s.rank)).toEqual([1, 2, 2, 4])
    })

    it('lists tied teams in the same order whichever way the input arrives', () => {
        const one = getLeagueStandings([team('b', 10, 50), team('a', 10, 50), team('c', 30, 0)])
        const two = getLeagueStandings([team('c', 30, 0), team('a', 10, 50), team('b', 10, 50)])

        expect(one.map(s => s.team.id)).toEqual(['c', 'a', 'b'])
        expect(two.map(s => s.team.id)).toEqual(['c', 'a', 'b'])
    })

    describe('pre-week-1 (everyone on 0 league points and 0 fantasy points', () => {
        it('orders by draft position, pick 1 first', () => {
            const standings = getLeagueStandings([
                team('a', 0, 0, 3), team('b', 0, 0, 1), team('c', 0, 0, 2),
            ])

            expect(standings.map(s => s.team.id)).toEqual(['b', 'c', 'a'])
            expect(standings.map(s => s.rank)).toEqual([1, 2, 3])
        })

        it('puts teams with no draft position last, sharing a rank', () => {
            const standings = getLeagueStandings([
                team('a', 0, 0, null), team('b', 0, 0, 1), team('c', 0, 0, null),
            ])

            expect(standings.map(s => s.team.id)).toEqual(['b', 'a', 'c'])
            expect(standings.map(s => s.rank)).toEqual([1, 2, 2])
        })

        it('ignores draft position once anyone scored', () => {
            const standings = getLeagueStandings([
                team('a', 3, 40, 1), team('b', 0, 0, 2), team('c', 0, 0, 3),
            ])

            expect(standings.map(s => s.team.id)).toEqual(['a', 'b', 'c'])
            expect(standings.map(s => s.rank)).toEqual([1, 2, 2])
        })
    })

    it('handles an empty league', () => {
        expect(getLeagueStandings([])).toEqual([])
    })
})

describe('getTeamRank', () => {
    it('returns the correct rank for a specific team', () => {
        const teams = [team('a', 10, 0), team('b', 30, 0), team('c', 20, 0)]

        expect(getTeamRank(teams, 'b')).toBe(1)
        expect(getTeamRank(teams, 'c')).toBe(2)
        expect(getTeamRank(teams, 'a')).toBe(3)
    })

    it('returns null for a team not in the list', () => {
        expect(getTeamRank([team('a', 10, 0)], 'zzz')).toBeNull()
    })

    it('returns the shared rank for tied teams', () => {
        expect(getTeamRank([team('a', 10, 5), team('b', 10, 5)], 'b')).toBe(1)
    })
})