export type TransferBidInput = {
    id: string
    fantasyTeamId: string
    playerId: number
    amount: number
    playerToDropId: number | null
}

export type TransferBidTeamInput = {
    id: string
    standingsRank: number // lower = worse record
}

export type TransferBidResult = {
    bidId: string
    status: 'won' | 'lost'
}

export type TransferBidResolution = {
    bidResults: TransferBidResult[]
    winningDrops: { fantasyTeamId: string; playerId: number }[] // players dropped as a result of winning
    fundsSpent: Record<string, number> // fantasyTeamId -> amount to deduct
    playersWon: { fantasyTeamId: string; playerId: number; playerToDropId: number | null }[]
}

/**
 * Resolves all transfer fund bids for a single window. Each constested player's
 * auction resolves independently - highest bid wins, ties broken by standingsRank
 * (lower/worse record wins). No turn-based cycling unlike waiver claims
 */
export function resolveTransferBids(
    bids: TransferBidInput[],
    teams: TransferBidTeamInput[]
): TransferBidResolution {
    const teamRankMap = new Map(teams.map(t => [t.id, t.standingsRank]))
    const bidsByPlayer = new Map<number, TransferBidInput[]>()

    for (const bid of bids) {
        const list = bidsByPlayer.get(bid.playerId) ?? []
        list.push(bid)
        bidsByPlayer.set(bid.playerId, list)
    }

    const bidResults: TransferBidResult[] = []
    const fundsSpent: Record<string, number> = {}
    const playersWon: TransferBidResolution['playersWon'] = []
    const winningDrops: TransferBidResolution['winningDrops'] = []

    for (const [playerId, playerBids] of bidsByPlayer.entries()) {
        const sorted = [...playerBids].sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount
            const aRank = teamRankMap.get(a.fantasyTeamId) ?? Infinity
            const bRank = teamRankMap.get(b.fantasyTeamId) ?? Infinity
            return aRank - bRank // lower rank (worse standing) wins
        })

        const winner = sorted[0]

        for (const bid of sorted) {
            if (bid.id === winner.id) {
                bidResults.push({ bidId: bid.id, status: 'won' })
                fundsSpent[bid.fantasyTeamId] = (fundsSpent[bid.fantasyTeamId] ?? 0) + bid.amount
                playersWon.push({ fantasyTeamId: bid.fantasyTeamId, playerId, playerToDropId: bid.playerToDropId })
                if (bid.playerToDropId !== null) {
                    winningDrops.push({ fantasyTeamId: bid.fantasyTeamId, playerId: bid.playerToDropId })
                }
            } else {
                bidResults.push({ bidId: bid.id, status: 'lost'})
            }
        }
    }

    return { bidResults, winningDrops, fundsSpent, playersWon }
}