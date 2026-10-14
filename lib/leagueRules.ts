// Fantasy league rules - the numbers that define how the game works, as distinct from
// sportmonksConstants.ts (ids and codes that come from the Sportmonks API).

/** Max players on a fantasy roster, not counting IR. */
export const MAX_NON_IR_ROSTER = 23

// Contestant statuses that are still in the game, so they can be picked as a predicted boot
// or swapped into a tribe. (The others are end states)
export const PICKABLE_CONTESTANT_STATUSES = ['active', 'finalist']