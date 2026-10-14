import { MAX_NON_IR_ROSTER } from './leagueRules'

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
    rosterPlayerIds: number[]
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

function pickAuctionWinners(
    bids: TransferBidInput[],
    rankOf: (teamId: string) => number
): TransferBidInput[] {
    const bidsByPlayer = new Map<number, TransferBidInput[]>()
    for (const bid of bids) {
        const list = bidsByPlayer.get(bid.playerId) ?? []
        list.push(bid)
        bidsByPlayer.set(bid.playerId, list)
    }

    return Array.from(bidsByPlayer.values()).map(playerBids => {
        const sorted = [...playerBids].sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount
            const rankDiff = rankOf(a.fantasyTeamId) - rankOf(b.fantasyTeamId)
            if (rankDiff !== 0) return rankDiff
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        })
        return sorted[0]
    })
}

/**
 * Checks each team's auction wins against its roster, applying a team's wins in order of 
 * highest bid first. A win is valid when its drop target is still on the roster (the drop
 * frees the slot) or the roster has an open slot. A drop target that's gone is treated as no
 * drop, so it needs an open slot; a drop target already used by an earlier win is "gone".
 * Returns the invalid winners and, for valid ones, the drop that will actually happen.
 */
function validateWinners(
    winners: TransferBidInput[],
    teamsById: Map<string, TransferBidTeamInput>
): { invalidIds: Set<string>; effectiveDrop: Map<string, number | null> } {
    const invalidIds = new Set<string>
    const effectiveDrop = new Map<string, number | null>()

    const winnersByTeam = new Map<string, TransferBidInput[]>()
    for (const w of winners) {
        const list = winnersByTeam.get(w.fantasyTeamId) ?? []
        list.push(w)
        winnersByTeam.set(w.fantasyTeamId, list)
    }

    for (const [teamId, teamWins] of winnersByTeam) {
        const roster = new Set(teamsById.get(teamId)?.rosterPlayerIds ?? [])
        const ordered = [...teamWins].sort((a, b) =>
            b.amount !== a.amount ? b.amount - a.amount : (a.id < b.id ? -1 : 1)
        )

        for (const win of ordered) {
            const dropPresent = win.playerToDropId !== null && roster.has(win.playerToDropId)

            if (dropPresent) {
                roster.delete(win.playerToDropId!)
                effectiveDrop.set(win.id, win.playerToDropId)
            } else if (roster.size < MAX_NON_IR_ROSTER) {
                effectiveDrop.set(win.id, null)
            } else {
                invalidIds.add(win.id)
                continue
            }
            roster.add(win.playerId)
        }
    }

    return { invalidIds, effectiveDrop }
}

/**
 * Resolves all transfer fund bids for a single window. Each constested player's
 * auction resolves independently - highest bid wins, ties broken by standingsRank
 * (lower/worse record wins). No turn-based cycling unlike waiver claims.
 * 
 * A winning bid that can't legally be applied to the winner's roster (roster full, no usable drop)
 * is thrown out and that player's auction is re-run, sot the next-highest bidder wins instead.
 * Funds are not re-checked here: bids are validated against available funds when placed, and a
 * balance only goes up between then and processing.
 */
export function resolveTransferBids(
    bids: TransferBidInput[],
    teams: TransferBidTeamInput[]
): TransferBidResolution {
    const teamsById = new Map(teams.map(t => [t.id, t]))
    const rankOf = (teamId: string) => teamsById.get(teamId)?.standingsRank ?? Infinity

    let remaining = bids
    for (;;) {
        const winners = pickAuctionWinners(remaining, rankOf)
        const { invalidIds, effectiveDrop } = validateWinners(winners, teamsById)

        if (invalidIds.size > 0) {
            remaining = remaining.filter(b => !invalidIds.has(b.id))
            continue
        }

        const winnerIds = new Set(winners.map(w => w.id))
        const bidResults: TransferBidResult[] = bids.map(b => ({
            bidId: b.id,
            status: winnerIds.has(b.id) ? 'won' : 'lost',
        }))

        const fundsSpent: Record<string, number> = {}
        const playersWon: TransferBidResolution['playersWon'] = []
        const winningDrops: TransferBidResolution['winningDrops'] = []

        for (const w of winners) {
            const drop = effectiveDrop.get(w.id) ?? null
            fundsSpent[w.fantasyTeamId] = (fundsSpent[w.fantasyTeamId] ?? 0) + w.amount
            playersWon.push({ fantasyTeamId: w.fantasyTeamId, playerId: w.playerId, playerToDropId: drop })
            if (drop !== null) {
                winningDrops.push({ fantasyTeamId: w.fantasyTeamId, playerId: drop })
            }
        }

        return { bidResults, winningDrops, fundsSpent, playersWon }
    }
}