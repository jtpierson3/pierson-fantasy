export type PendingClaimLike = {
    id: string
    fantasyTeamId: string
    playerId: number
    playerToDropId: number | null
}

export type CascadeResult = {
    invalidatedClaimIds: string[]
}

/**
 * Given a set of players that were just dropped as a result of winning TFBs, finds every
 * other pending claim (waiver claim or TFB) belonging to the SAME team that depended on 
 * one of those now-gone players - either as the thing they wanted to add or the player they
 * intended to drop. Those claims can no longer succeed as submitted and must be invalidated.
 */
export function findCascadeInvalidations(
    winningDrops: { fantasyTeamId: string; playerId: number }[],
    allPendingClaims: PendingClaimLike[]
): CascadeResult {
    const invalidatedClaimIds: string[] = []

    for (const drop of winningDrops) {
        for (const claim of allPendingClaims) {
            if (claim.fantasyTeamId !== drop.fantasyTeamId) continue
            const dependsOnDroppedPlayer =
                claim.playerId === drop.playerId || claim.playerToDropId === drop.playerId
            if (dependsOnDroppedPlayer) {
                invalidatedClaimIds.push(claim.id)
            }
        }
    }

    return { invalidatedClaimIds: [...new Set(invalidatedClaimIds)]}
}