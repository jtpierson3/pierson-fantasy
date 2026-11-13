// Fantasy league rules - the numbers that define how the game works, as distinct from
// sportmonksConstants.ts (ids and codes that come from the Sportmonks API).

/** Max players on a fantasy roster, not counting IR. */
export const MAX_NON_IR_ROSTER = 23

/** Max substitutes on a lineup (bench slot 1 .. MAX_SUBS) */
export const MAX_SUBS = 5

/** Smallest opening transfer bid, in dollars. */
export const MIN_STARTING_BID = 1_000_000

/** Bids move in steps of this size: a raise must clear the current high bid's floored step. */
export const MIN_RAISE = 1_000_000

/** Waivers and transfers lock this many hours before a gameweek's first kickoff. */
export const LOCK_HOURS_BEFORE_KICKOFF = 2

/**
 * Premier League gameweeks in a season, which is how many weeks a generated league schedule has.
 * A fixed constant for now; it would become a per-league field if leagues ever differ in length.
 * (e.g. Bundesliga or Ligue Un having 18 teams instead of 20).
 */
export const PREMIER_LEAGUE_GAMEWEEKS = 38

/**
 * The lowest bid that beats the current high bid by a full rase step.
 * With no bids yet, it is the starting bid.
 */
export function minBidFor(currentHighBid: number | null): number {
    if (!currentHighBid)return MIN_STARTING_BID
    return Math.floor(currentHighBid / MIN_RAISE) * MIN_RAISE + MIN_RAISE
}

/****************** SURVIVOR LEAGUE RULES (Should probably move out at some point) */

// Contestant statuses that are still in the game, so they can be picked as a predicted boot
// or swapped into a tribe. (The others are end states)
export const PICKABLE_CONTESTANT_STATUSES = ['active', 'finalist']