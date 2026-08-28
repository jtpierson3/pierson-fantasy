import { describe, it, expect } from 'vitest'
import {
    resolveWaiverClaims,
    type WaiverClaimInput,
    type WaiverTeamInput,
} from './waiverClaimResolution'

function team(id: string, waiverPriority: number, roster: number[] = []) : WaiverTeamInput {
    return { id, waiverPriority, rosterPlayerIds: roster, rosterSize: roster.length }
}

function claim(
    id: string, 
    fantasyTeamId: string, 
    playerToAddId: number,
    opts: { drop?: number; rank?: number } = {}
): WaiverClaimInput{
    return {
        id,
        fantasyTeamId,
        playerToAddId,
        playerToDropId: opts.drop ?? null,
        rank: opts.rank ?? 1,
    }
}

const statusOf = (r: ReturnType<typeof resolveWaiverClaims>, claimId: string) =>
    r.claimResults.find(c => c.claimId === claimId)?.status

describe('resolveWaiverClaims', () => {
    it('lower waiverPriority wins a contested player; other claim is lost', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100), claim('c2', 'B', 100)],
            [team('A', 1), team('B', 4)]
        )

        expect(statusOf(res, 'c1')).toBe('won')
        expect(statusOf(res, 'c2')).toBe('lost')
        expect(res.finalTeamState['A'].rosterPlayerIds).toContain(100)
    })

    it('winner rolls to back of the line (max-Priority + 1)', () => {
        const res = resolveWaiverClaims(
            [claim('c1', 'A', 100)],
            [team('A', 1), team('B', 4), team('C', 7)]
        )

        expect(res.finalTeamState['A'].rosterPlayerIds).toBe(8)
        expect(res.finalTeamState['B'].waiverPriority).toBe(4)
    })
})