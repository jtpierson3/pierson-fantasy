export type BidLike = {
    id: string
    fantasyTeamId: string
    playerId: number
    amount: number
}

export type StandingLike = { id: string; rank: number }

export type LeadingBid<T extends BidLike> = {
    bid: T
    competingBids: number
}

/**
 * Groups pending bids by player and picks the current leader for each.
 * Highest amount wins; ties on amount go to the WORSE league standing
 * (highest rank number), matching resolveTransferBids' tiebreak.
 */
export function leadingBidsByPlayer<T extends BidLike>(
    bids: T[],
    standings: StandingLike[]
): Map<number, LeadingBid<T>> {
    const rankById = new Map(standings.map(s => [s.id, s.rank]))
    const rankOf = (teamId: string) => rankById.get(teamId) ?? Infinity

    const byPlayer = new Map<number, T[]>()
    for (const b of bids) {
        const list = byPlayer.get(b.playerId) ?? []
        list.push(b)
        byPlayer.set(b.playerId, list)
    }

    const result = new Map<number, LeadingBid<T>>()
    for (const [playerId, list] of byPlayer) {
        const leader = list.reduce((best, b) => {
            if (b.amount > best.amount) return b
            if (b.amount === best.amount && rankOf(b.fantasyTeamId) > rankOf(best.fantasyTeamId)) return b
            return best
        })
        result.set(playerId, { bid: leader, competingBids: list.length})
    }
    return result
}