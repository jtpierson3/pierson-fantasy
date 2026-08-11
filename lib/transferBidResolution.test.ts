import { describe, it, expect } from 'vitest'
import { resolveTransferBids, type TransferBidInput, type TransferBidTeamInput } from './transferBidResolution'

function bid(
    id: string, 
    teamId: string, 
    playerId: number, 
    amount: number, 
    dropId: number | null = null
): TransferBidInput{
    return {id, fantasyTeamId: teamId, playerId, amount, playerToDropId: dropId }
}

function team(id: string, standingsRank: number): TransferBidTeamInput {
    return { id, standingsRank }
}

describe('ResolveTransferBids', () => {
    it('the higheset bid wins an uncontested auction', () => {
        const bids = [bid('b1', 'teamA', 100, 5_000_000)]
        const teams = [team('teamA', 1)]

        const { bidResults } = resolveTransferBids(bids, teams)
        expect(bidResults).toEqual([{ bidId: 'b1', status: 'won' }])
    })

    it('the highest bid wins a contested auction, others lose', () => {
        const bids = [
            bid('b1', 'teamA', 100, 5_000_000),
            bid('b2', 'teamB', 100, 8_000_000)
        ]
        const teams = [team('teamA', 1), team('teamB', 2)]

        const { bidResults } = resolveTransferBids(bids, teams)

        expect(bidResults.find(r => r.bidId === 'b2')?.status).toBe('won')
        expect(bidResults.find(r => r.bidId === 'b1')?.status).toBe('lost')
    })

    it('breaks a tie in favor of lower standings rank', () => {
        const bids = [
            bid('b1', 'teamA', 100, 5_000_000),
            bid('b2', 'teamB', 100, 5_000_000)
        ]
        const teams = [team('teamA', 1), team('teamB', 2)]

        const { bidResults } = resolveTransferBids(bids, teams)

        expect(bidResults.find(r => r.bidId === 'b1')?.status).toBe('won')
        expect(bidResults.find(r => r.bidId === 'b2')?.status).toBe('lost')
    })

    it('resolves multiple independent players in the same run', () => {
        const bids = [
            bid('b1', 'teamA', 100, 5_000_000),
            bid('b2', 'teamB', 200, 5_000_000)
        ]
        const teams = [team('teamA', 1), team('teamB', 2)]

        const { bidResults } = resolveTransferBids(bids, teams)

        expect(bidResults.find(r => r.bidId === 'b1')?.status).toBe('won')
        expect(bidResults.find(r => r.bidId === 'b2')?.status).toBe('won')
    })

    it('tracks funds spent per team based on their winning bid amount', () => {
        const bids = [bid('b1', 'teamA', 100, 12_000_000)]
        const teams = [team('teamA', 1)]

        const { fundsSpent } = resolveTransferBids(bids, teams)

        expect(fundsSpent['teamA']).toBe(12_000_000)
    })

    it('sums funds spent across multiple wins by the same team', () => {
        const bids = [
            bid('b1', 'teamA', 100, 5_000_000),
            bid('b2', 'teamA', 200, 3_000_000)
        ]
        const teams = [team('teamA', 1)]

        const { fundsSpent } = resolveTransferBids(bids, teams)

        expect(fundsSpent['teamA']).toBe(8_000_000)
    })

    it('records winningDrops for cascaede invalidation when a winning bid requires a drop', () => {
        const bids = [bid('b1', 'teamA', 100, 5_000_000, 999)]
        const teams = [team('teamA', 1)]

        const { winningDrops } = resolveTransferBids(bids, teams)

        expect(winningDrops).toEqual([{ fantasyTeamId: 'teamA', playerId: 999 }])
    })

    it('does not record a winningDrop when no drop was specified', () => {
        const bids = [bid('b1', 'teamA', 100, 5_000_000)]
        const teams = [team('teamA', 1)]

        const { winningDrops } = resolveTransferBids(bids, teams)

        expect(winningDrops).toEqual([])
    })
})