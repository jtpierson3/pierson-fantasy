export type FixtureSyncPlan =
    | { action: 'skip' }
    | { action: 'create' | 'update'; homeTeamId: number | null; awayTeamId: number | null }

/**
 * Decides what the fixtures sync should do with one fixture from Sportmonks.
 * - Fixturesthat already finished (terminal status) are never touched again, so late
 *   feed changes can't overwrite settled results.
 * - A side is only linked to a team row if we track that team; otherwise it's null and the 
 *   name/image columns carry the display.
 */
export function planFixtureSync(args: {
    homeId: number
    awayId: number
    existingStatus: string | undefined
    knownTeamIds: ReadonlySet<number>
    terminalStates: ReadonlySet<string>
}): FixtureSyncPlan {
    const { homeId, awayId, existingStatus, knownTeamIds, terminalStates } = args

    if (existingStatus !== undefined && terminalStates.has(existingStatus)) {
        return { action: 'skip' }
    }

    return {
        action: existingStatus === undefined ? 'create' : 'update',
        homeTeamId: knownTeamIds.has(homeId) ? homeId : null,
        awayTeamId: knownTeamIds.has(awayId) ? awayId : null,
    }
}