export type LeagueClaim = { playerToAddId: number; fantasyTeamId: string }

export type LeagueBid = {
    playerId: number
    amount: number
    fantasyTeamId: string
    fantasyTeamName: string
}

export type PlayerCompetition = {
    competingClaimTeamIds: string[]
    highBid: LeagueBid | null
    myBid: LeagueBid | null
    hasForeignBid: boolean
    projectedBidWinnerIsMe: boolean | null
}

/**
 * Everything the My Team page needs to know about the competition for one player:
 * other teams' pending claims on them, and the pending bid picture (highest bid, mine, and
 * whether someone else is ahead). leagueClaims must exclude my own team's claims.
 */
export function summarizePlayerCompetition(args: {
    myTeamId: string
    playerId: number
    leagueClaims: LeagueClaim[]
    leagueBids: LeagueBid[]
}): PlayerCompetition {
    const { myTeamId, playerId, leagueClaims, leagueBids } = args

    const competingClaimTeamIds = leagueClaims
        .filter(c => c.playerToAddId === playerId && c.fantasyTeamId !== myTeamId)
        .map(c => c.fantasyTeamId)

    const bids = leagueBids
        .filter(b => b.playerId === playerId)
        .sort((a, b) => b.amount - a.amount)

    const highBid = bids[0] ?? null
    const myBid = bids.find(b => b.fantasyTeamId === myTeamId) ?? null

    return {
        competingClaimTeamIds,
        highBid,
        myBid,
        hasForeignBid: highBid ? highBid.fantasyTeamId !== myTeamId : false,
        projectedBidWinnerIsMe: highBid ? highBid.fantasyTeamId === myTeamId : null,
    }
}