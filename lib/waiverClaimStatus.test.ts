import { describe, it, expect } from 'vitest'
import { getWaiverClaimBadge } from './waiverClaimStatus'

const base = {
    myWaiverPriority: 3,
    competingClaimPriorities: [] as number[],
    hasForeignBid: false,
    projectedBidWinnerIsMe: null as boolean | null
}

describe('getWaiverClaimBadge', () => {
    it('no other claimants and no bids -> only claim', () => {
        expect(getWaiverClaimBadge({ ...base })).toBe('only-claim')
    })

    it('my priority is strictly best among claimants -> leading', () => {
        expect(getWaiverClaimBadge({
            ...base, myWaiverPriority: 2, competingClaimPriorities: [5, 8],
        })).toBe('leading')
    })

    it('my priority is worse than another claimant -> losing', () => {
        expect(getWaiverClaimBadge({
            ...base, myWaiverPriority: 6, competingClaimPriorities: [4],
        })).toBe('losing')
    })

    it('foreign bid present and I am not the projected bid winner -> losing to bid even with best waiver priority', () => {
        expect(getWaiverClaimBadge({
            ...base,
            myWaiverPriority: 1,
            competingClaimPriorities: [9],
            hasForeignBid: true,
            projectedBidWinnerIsMe: false,
        })).toBe('losing-to-bid')
    })

    it('foreign bid present but I hold the highest bid -> fall through to waiver-priority logic', () => {
        expect(getWaiverClaimBadge({
            ...base,
            myWaiverPriority: 2,
            competingClaimPriorities: [5],
            hasForeignBid: true,
            projectedBidWinnerIsMe: true,
        })).toBe('leading')
    })

    it('only my own bid exists (no foreign bid) -> not losing to bid', () => {
        expect(getWaiverClaimBadge({
            ...base,
            competingClaimPriorities: [1],
            hasForeignBid: false,
            projectedBidWinnerIsMe: true,
        })).toBe('losing')
    })

    it('losing to bid outranks a would be only claim', () => {
        expect(getWaiverClaimBadge({
            ...base, hasForeignBid: true, projectedBidWinnerIsMe: false,
        })).toBe('losing-to-bid')
    })
})