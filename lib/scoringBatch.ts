/** Max fixtures one process-scoring run will handle. Leftovers are picked up by the next hourly run. */
export const MAX_FIXTURES_PER_SCORING_RUN = 6

export type FixtureRef = { id: number; gameweekNumber: number | null }

export type ScoringJob = {
    fixtureId: number
    gameweekNumber: number | null
    passes: (1 | 2)[]
}

/**
 * Merges the Pass 1 and Pass 2 candidates into one job list, capped at `cap`.
 * - Pass 1 candidates go first: they're the time sensitive ones (live-ish scores).
 * - A fixture that needs both passes is synced once and marked for both.
 * - Anything past the cap is simply not started; the completion flags on the fixtures mean the
 *   next run picks it up. `deferred` is how many were left over.
 */
export function selectScoringBatch(
    pass1: FixtureRef[],
    pass2: FixtureRef[],
    cap: number
): { jobs: ScoringJob[]; deferred: number } {
    const byFixture = new Map<number, ScoringJob>()

    for (const fixture of pass1) {
        byFixture.set(fixture.id, { fixtureId: fixture.id, gameweekNumber: fixture.gameweekNumber, passes: [1] })
    }
    for (const fixture of pass2) {
        const existing = byFixture.get(fixture.id)
        if (existing) existing.passes.push(2)
        else byFixture.set(fixture.id, { fixtureId: fixture.id, gameweekNumber: fixture.gameweekNumber, passes: [2] })
    }

    const all = [...byFixture.values()]
    return { jobs: all.slice(0, cap), deferred: Math.max(0, all.length - cap) }
}

export type Pass2Candidate = FixtureRef & {
    kickoff: Date
    statsPass2CompletedAt: Date | null
}

/**
 * Pass 2 (the corrections check) for one gameweek: only once its LAST fixture kicked off at or
 * before the cutoff, and only the fixtures that haven't had it yet - a retry after a partial
 * failure shouldn't re-fetch fixtures that already finished.
 */
export function selectPass2Fixtures(fixturesInWeek: Pass2Candidate[], pass2Cutoff: Date): FixtureRef[] {
    if (fixturesInWeek.length === 0) return []

    const lastKickoff = fixturesInWeek.reduce(
        (latest, fixture) => (fixture.kickoff > latest ? fixture.kickoff : latest),
        new Date(0)
    )
    if (lastKickoff > pass2Cutoff) return []

    return fixturesInWeek
        .filter(fixture => fixture.statsPass2CompletedAt === null)
        .map(fixture => ({ id: fixture.id, gameweekNumber: fixture.gameweekNumber }))
}