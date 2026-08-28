export type WaiverClaimStatusInput = {
    myWaiverPriority: number
    competingClaimPriorities: number[]
    projectedBidWinnerIsMe: boolean | null
    hasForeignBid: boolean
}

export type WaiverClaimBadge = 'only-claim' | 'leading' | 'losing' | 'losing-to-bid'

/**
 * Decides which status badge to show next to one of my pending waiver claims
 * 
 * Resolution order mirrors /app/api/transfer-and-waiver-processing/route.ts:
 *   Phase 1 - transfer-fund bids (highest amout wins, no minimum competition)
 *   Phase 2 - waiver claims (lowest waiverPriority wins, rolling priority)
 * so a bid always beats a claim for the same player
 */
export function getWaiverClaimBadge(input: WaiverClaimStatusInput): WaiverClaimBadge {
    const { myWaiverPriority, competingClaimPriorities, hasForeignBid, projectedBidWinnerIsMe } = input

    if (hasForeignBid && projectedBidWinnerIsMe !== true) {
        return 'losing-to-bid'
    }

    if (competingClaimPriorities.length === 0) {
        return 'only-claim'
    }

    const bestCompeting = Math.min(...competingClaimPriorities)

    if (myWaiverPriority < bestCompeting) return 'leading'
    return 'losing'
}