import { describe, it, expect } from 'vitest'
import { findCascadeInvalidations, type PendingClaimLike } from './transferCascade'

function claim(
    id: string,
    teamId: string,
    playerId: number,
    dropId: number | null = null
): PendingClaimLike {
    return { id, fantasyTeamId: teamId, playerId, playerToDropId: dropId}
}

describe('findCascadeInvalidations', () => {
    it('invalidates another claim by the same team that wanted to drop the same player', () => {
        const winningDrops = [{ fantasyTeamId: 'teamA', playerId: 999 }]
        const claims = [
            claim('c1', 'teamA', 100, 999), // also wants to drop 999, now invalid
            claim('c2', 'teamB', 200, 400) // different team, different player., unaffected
        ]

        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, claims)

        expect(invalidatedClaimIds).toEqual(['c1'])
    })

    it('invalidates another claim by the same team that wanted to ADD the now-gone player', () => {
        const winningDrops = [{ fantasyTeamId: 'teamA', playerId: 999 }]
        const claims = [
            claim('c1', 'teamA', 100, 999), // wanted to add player 999 who was just dropped
        ]

        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, claims)

        expect(invalidatedClaimIds).toEqual(['c1'])
    })

    it('does not invalidate a claim unrelated to any dropped player', () => {
        const winningDrops = [{ fantasyTeamId: 'teamA', playerId: 999 }]
        const claims = [
            claim('c1', 'teamA', 100, 555), // also wants to drop 999, now invalid
        ]

        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, claims)

        expect(invalidatedClaimIds).toEqual([])
    })

    it('handles multiple winning drops and deduplicates a claim invalidated by more than one', () => {
        const winningDrops = [
            { fantasyTeamId: 'teamA', playerId: 999 },
            { fantasyTeamId: 'teamA', playerId: 888 }
        ]
        const claims = [
            claim('c1', 'teamA', 100, 999)
        ]

        const { invalidatedClaimIds } = findCascadeInvalidations(winningDrops, claims)

        expect(invalidatedClaimIds).toEqual(['c1'])
    })

    it('returns an empty array when there are no winning drops at all', () => {
        const claims = [claim('c1', 'teamA', 100, 999)]
        const { invalidatedClaimIds } = findCascadeInvalidations([], claims)
        expect(invalidatedClaimIds).toEqual([])
    })
})