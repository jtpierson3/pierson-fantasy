import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'

const PASS_1_DELAY_MS = 2.5 * 60 * 60 * 1000
const PASS_2_DELAY_MS = 48 * 60 * 60 * 1000

async function callInternalRoute(path: string, body: Record<string, unknown>) {
    const baseUrl = process.env.APP_URL ?? 'https://pierson-fantasy.vercel.app'
    const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SYNC_SECRET}`,
            'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_SECRET ?? '',
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`${path} failed: ${res.status} - ${text}`)
    }
    return res.json()
}

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const now = new Date()
    const pass1Cutoff = new Date(now.getTime() - PASS_1_DELAY_MS)
    const pass2Cutoff = new Date(now.getTime() - PASS_2_DELAY_MS)

    const touchedGameweekNumbers = new Set<number>()
    const results: { fixtureId: number; pass: 1 | 2; success: boolean; error?: string }[] = []

    try {
        const pass1Fixtures = await prisma.fixture.findMany({
            where: {
                kickoff: { lte: pass1Cutoff },
                statsPass1CompletedAt: null
            }
        })

        for (const fixture of pass1Fixtures) {
            try {
                await callInternalRoute('/api/sync/scoring/sync-fixture-stats', { fixtureId: fixture.id })
                await callInternalRoute('/api/sync/scoring/calculate-fixture-points', {fixtureId: fixture.id })
                await prisma.fixture.update({
                    where: { id: fixture.id },
                    data: { statsPass1CompletedAt: now }
                })
                if (fixture.gameweekNumber) touchedGameweekNumbers.add(fixture.gameweekNumber)
                results.push({ fixtureId: fixture.id, pass: 1, success: true })
            } catch (err) {
                results.push({ fixtureId: fixture.id, pass: 1, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
            }
        }

        // --- Pass 2 Candidates ---
        // A gameweek is eligible once its LAST fixture's kickoff was >= 48 hours ago,
        // and Pass 2 processes EVERY fixture in that gameweek (corrections check),
        // regardless of whether it already had Pass 1
        const allGameweekNumbers = await prisma.fixture.findMany({
            where: { gameweekNumber: { not: null } },
            select: { gameweekNumber: true },
            distinct: ['gameweekNumber']
        })

        for (const { gameweekNumber } of allGameweekNumbers) {
            if (gameweekNumber === null) continue

            const fixturesInWeek = await prisma.fixture.findMany({
                where: { gameweekNumber }
            })

            const lastKickoff = fixturesInWeek.reduce(
                (latest, f) => (f.kickoff > latest ? f.kickoff : latest),
                new Date(0)
            )

            const eligibleForPass2 = lastKickoff <= pass2Cutoff
            if (!eligibleForPass2) continue

            const needsPass2 = fixturesInWeek.some(f => f.statsPass2CompletedAt === null)
            if (!needsPass2) continue

            for (const fixture of fixturesInWeek) {
                try {
                    await callInternalRoute('/api/sync/scoring/sync-fixture-stats', { fixtureId: fixture.id })
                    await callInternalRoute('/api/sync/scoring/calculate-fixture-points', { fixtureId: fixture.id })
                    await prisma.fixture.update({
                        where: { id: fixture.id },
                        data: { statsPass2CompletedAt: now }
                    })
                    results.push({ fixtureId: fixture.id, pass: 2, success: true })
                } catch (err) {
                    results.push({ fixtureId: fixture.id, pass: 2, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
                }
            }

            touchedGameweekNumbers.add(gameweekNumber)
        }

        // --- Resolve lineups for every gameweek touched this run ---
        const gameweeksResolved: string[] = []
        for (const gwNumber of touchedGameweekNumbers) {
            const matchingGameweeks = await prisma.fantasyGameweek.findMany({
                where: { gameweekNumber: gwNumber },
                select: { id: true }
            })
            for (const gw of matchingGameweeks) {
                try { 
                    await callInternalRoute('/api/sync/scoring/resolve-gameweek-lineups', { gameweekId: gw.id })
                    gameweeksResolved.push(gw.id)
                } catch (err) {
                    console.error(`[process-scoring] failed to resolve lineups for gameweek ${gw.id}:`, err)
                }
            }
        }

        return NextResponse.json({
            success: true,
            pass1Processed: results.filter(r => r.pass === 1).length,
            pass2Processed: results.filter(r => r.pass === 2).length,
            gameweeksResolved: gameweeksResolved.length,
            results,
        })
    } catch (err) {
        console.error('[process-scoring] error:', err)
        return NextResponse.json({ error: 'Failed to process scoring'}, { status: 500 })
    }
}