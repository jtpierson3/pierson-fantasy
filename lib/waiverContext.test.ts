import { describe, it, expect } from 'vitest'
import { summarizePlayerCompetition, type LeagueBid } from './waiverContext'

const bid = (playerId: number, amount: number, team: string): LeagueBid => ({
    playerId, amount, fantasyTeamId: team, fantasyTeamName: `Team ${team}`,
})

describe('summarizePlayerCompetition', () => {
    it('reports no competition when nobody else is involved', () => {
        const r = summarizePlayerCompetition({ myTeamId: 'A', playerId: 1, leagueClaims: [], leagueBids: [] })
        expect(r.competingClaimTeamIds).toEqual([])
        expect(r.highBid).toBeNull()
        expect(r.hasForeignBid).toBe(false)
        expect(r.projectedBidWinnerIsMe).toBeNull()
    })

    it('only counts claims on this player from other teams', () => {
        const r = summarizePlayerCompetition({
            myTeamId: 'A',
            playerId: 1,
            leagueClaims: [
                { playerToAddId: 1, fantasyTeamId: 'B' },
                { playerToAddId: 2, fantasyTeamId: 'C' },
                { playerToAddId: 1, fantasyTeamId: 'A' },
            ],
            leagueBids: [],
        })
        expect(r.competingClaimTeamIds).toEqual(['B'])
    })

    it('finds the high bid among bids on this player only', () => {
        const r = summarizePlayerCompetition({
            myTeamId: 'A',
            playerId: 1,
            leagueClaims: [],
            leagueBids: [bid(1, 5, 'A'), bid(1, 9, 'B'), bid(2, 99, 'C')],
        })
        expect(r.highBid?.fantasyTeamId).toBe('B')
        expect(r.myBid?.amount).toBe(5)
        expect(r.hasForeignBid).toBe(true)
        expect(r.projectedBidWinnerIsMe).toBe(false)
    })

    it('knows when I am the high bidder', () => {
        const r = summarizePlayerCompetition({
            myTeamId: 'A',
            playerId: 1,
            leagueClaims: [],
            leagueBids: [bid(1, 9, 'A'), bid(1, 5, 'B')],
        })
        expect(r.hasForeignBid).toBe(false)
        expect(r.projectedBidWinnerIsMe).toBe(true)
    })

    it('keeps input order on tied bids', () => {
        const r = summarizePlayerCompetition({
            myTeamId: 'A',
            playerId: 1,
            leagueClaims: [],
            leagueBids: [bid(1, 5, 'B'), bid(1, 5, 'A')],
        })
        expect(r.highBid?.fantasyTeamId).toBe('B')
    })
})