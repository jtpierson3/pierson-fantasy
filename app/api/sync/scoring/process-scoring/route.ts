import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { syncFixtureStats } from '@/lib/syncFixtureStats'
import { calculateFixturePoints } from '@/lib/calculateFixturePoints'
import { resolveGameweekLineups } from '@/lib/resolveGameweekLineups'
import {
    MAX_FIXTURES_PER_SCORING_RUN,
    selectPass2Fixtures,
    selectScoringBatch,
    type FixtureRef
} from '@/lib/scoringBatch'

// Hobby plan ceiling. The run also stops starting new fixtures under TIME_BUDGET_MS so it
// finishes (and resolves lineups) inside this limit instaed of being killed mid-write.
export const maxDuration = 60
const TIME_BUDGET_MS = 45_000

const PASS_1_DELAY_MS = 2.5 * 60 * 60 * 1000
const PASS_2_DELAY_MS = 48 * 60 * 60 * 1000

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const startedAt = Date.now()
    const now = new Date()
    const pass1Cutoff = new Date(now.getTime() - PASS_1_DELAY_MS)
    const pass2Cutoff = new Date(now.getTime() - PASS_2_DELAY_MS)

    const touchedGameweekNumbers = new Set<number>()
    const results: { fixtureId: number; passes: (1 | 2)[]; success: boolean; error?: string }[] = []

    try {
        const currentGameweeks = await prisma.fantasyGameweek.findMany({
            where: { isCurrent: true, isComplete: false },
            select: { gameweekNumber: true },
            distinct: ['gameweekNumber'],
        })
        const activeGameweekNumbers = currentGameweeks.map(g => g.gameweekNumber)

        const pass1Fixtures: FixtureRef[] = await prisma.fixture.findMany({
            where: {
                kickoff: { lte: pass1Cutoff },
                statsPass1CompletedAt: null,
                gameweekNumber: { in: activeGameweekNumbers },
            },
            select: { id: true, gameweekNumber: true },
        })

        // Pass 2: a gameweek is eligible once its LAST fixture kicked off >= 48 hours ago; every
        //fixture in it that hasn't had the corrections check yet gets one.
        const pass2Fixtures: FixtureRef[] = []
        for (const gameweekNumber of activeGameweekNumbers) {
            const fixturesInWeek = await prisma.fixture.findMany({
                where: { gameweekNumber },
                select: { id: true, gameweekNumber: true, kickoff: true, statsPass2CompletedAt: true },
            })
            pass2Fixtures.push(...selectPass2Fixtures(fixturesInWeek, pass2Cutoff))
        }

        const { jobs, deferred: deferredByCap } = selectScoringBatch(
            pass1Fixtures,
            pass2Fixtures,
            MAX_FIXTURES_PER_SCORING_RUN
        )

        let deferredByTime = 0
        for (let i = 0; i < jobs.length; i++) {
            if (Date.now() - startedAt > TIME_BUDGET_MS) {
                deferredByTime = jobs.length - i
                break
            }

            const job = jobs[i]
            try {
                const stats = await syncFixtureStats(job.fixtureId)
                if (!stats.ok) throw new Error(`sync-fixture-stats: ${stats.error}`)

                const points = await calculateFixturePoints(job.fixtureId)
                if (!points.ok) throw new Error(`calculate-fixture-points: ${points.error}`)

                await prisma.fixture.update({
                    where: { id: job.fixtureId },
                    data: {
                        ...(job.passes.includes(1) ? { statsPass1CompletedAt: now }: {}),
                        ...(job.passes.includes(2) ? { statsPass2CompletedAt: now }: {}),
                    },
                })
                if (job.gameweekNumber !== null) touchedGameweekNumbers.add(job.gameweekNumber)
                results.push({ fixtureId: job.fixtureId, passes: job.passes, success: true })
            } catch (err) {
                results.push({
                    fixtureId: job.fixtureId,
                    passes: job.passes,
                    success: false,
                    error: err instanceof Error ? err.message: 'Unknown error',
                })
            }
        }

        // --- Resolve lineups for every gameweek touched this run ---
        const gameweeksResolved: string[] = []
        for (const gwNumber of touchedGameweekNumbers) {
            const matchingGameweeks = await prisma.fantasyGameweek.findMany({
                where: { gameweekNumber: gwNumber },
                select: { id: true },
            })
            for (const gw of matchingGameweeks) {
                try {
                    const resolved = await resolveGameweekLineups(gw.id)
                    if (!resolved.ok) throw new Error(resolved.error)
                    gameweeksResolved.push(gw.id)
                } catch (err) {
                    console.error(`[processed-scoring] failed to resolve lineups for gameweek ${gw.id}: `, err)
                }
            }
        }

        const deferred = deferredByCap + deferredByTime
        if (deferred > 0) {
            console.warn(`[process-scoring] ${deferred} fixture(s) deferred to the next run`)
        }

        return NextResponse.json({
            success: true,
            pass1Processed: results.filter(r => r.success && r.passes.includes(1)).length,
            pass2Processed: results.filter(r => r.success && r.passes.includes(2)).length,
            gameweeksResolved: gameweeksResolved.length,
            deferred,
            results
        })
    } catch (err) {
        console.error('[process-scoring] error: ', err)
        return NextResponse.json({ error: 'Failed to process scoring' }, { status: 500 })
    }
}