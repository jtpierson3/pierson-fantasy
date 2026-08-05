const MIN_STARTING_BID = 1_000_000
const MIN_RAISE = 1_000_000

export type BidValidationResult = { valid: true } | { valid: false; error: string }

export function validateBidAmount(
    amount: number,
    currentHighBidAmount: number | null,
    availableFunds: number
): BidValidationResult {
    if (amount > availableFunds) {
        return { valid: false, error: `Insufficient available funds. You have ${availableFunds} available.` }
    }

    const isAllIn = amount === availableFunds

    if (currentHighBidAmount === null) {
        if (amount < MIN_STARTING_BID) {
            return { valid: false, error: `Minimum starting bid is ${MIN_STARTING_BID}.`}
        }
        return { valid: true }
    }

    if (amount < currentHighBidAmount) {
        return { valid: false, error: 'Your bid must exceed the current highest bid.'}
    }

    if (amount === currentHighBidAmount) {
        return { valid: true }
    }

    const flooredCurrentHigh = Math.floor(currentHighBidAmount / MIN_RAISE) * MIN_RAISE
    const minRequired = flooredCurrentHigh + MIN_RAISE

    if (amount < minRequired && !isAllIn) {
        return { valid: false, error: `Bids must raise by at least ${MIN_RAISE}`}
    }

    return { valid: true }
}