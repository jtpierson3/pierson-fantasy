import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFixtureDetail } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { STAT_TYPE_IDS } from '@/lib/scoringStatTypes'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { fixtureId } = await req.json()
    if (!fixtureId) return NextResponse.json({ error: 'fixtureId is required'}, { status: 400 })

    try {
        const { fixture, remaining } = await getFixtureDetail(fixtureId)

        await logApiCall(`fixtures/${fixtureId}`, 'SYNC_FIXTURES', {
            triggeredBy: 'scoring-sync',
            remainingAfterCall: remaining,
        })

        if (!fixture) {
            return NextResponse.json({ error: 'Fixture not found on Sportmonks' }, { status: 404 })
        }

        const homeFormationEntry = fixture.formations?.find(f => f.location === 'home')
        const awayFormationEntry = fixture.formations?.find(f => f.location === 'away')

        await prisma.fixture.update({
            where: { id: fixture. id },
            data: {
                homeFormation: homeFormationEntry?.formation ?? null,
                awayFormation: awayFormationEntry?.formation ?? null
            }
        })

        let synced = 0

        for (const lineup of fixture.lineups) {
            const playerExists = await prisma.player.findUnique({
                where: { id: lineup.player_id },
                select: { id: true }
            })
            if (!playerExists) {
                console.warn(`[sync-fixture-stats] skipping stats for unsynced player ${lineup.player_id}`)
                continue
            }

            const statsMap: Record<number, number> = {}
            let rating: number | null = null

            for (const detail of lineup.details) {
                if (detail.type_id === STAT_TYPE_IDS.RATING) {
                    rating = typeof detail.data.value === 'number' ? detail.data.value : null
                    continue
                }
                const value = typeof detail.data.value === 'number' ? detail.data.value : (detail.data.value ? 1 : 0)
                statsMap[detail.type_id] = value
            }

            const minutesPlayed = statsMap[STAT_TYPE_IDS.MINUTES_PLAYED] ?? 0
            const wasStarter = lineup.type_id === 11
            const positionPlayedId = lineup.detailedposition?.id ?? null

            await prisma.playerMatchStats.upsert({
                where: { playerId_fixtureId: { playerId: lineup.player_id, fixtureId: fixture.id } },
                update: {
                    minutesPlayed,
                    wasStarter,
                    rating,
                    positionPlayedId,
                    stats: statsMap,
                },
                create: {
                    playerId: lineup.player_id,
                    fixtureId: fixture.id,
                    minutesPlayed,
                    wasStarter,
                    rating,
                    positionPlayedId,
                    stats: statsMap,
                }
            })
            synced++
        }

        return NextResponse.json({ success: true, playersSynced: synced })
    } catch (err) {
        console.error('[sync-fixture-stats] error:', err)
        return NextResponse.json({ error: 'Failed to sync fixture stats' }, { status: 500 })
    }
}