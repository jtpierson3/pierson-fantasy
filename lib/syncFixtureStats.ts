import { prisma } from '@/lib/prisma'
import { getFixtureDetail } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'
import { STAT_TYPE_IDS } from '@/lib/scoringStatTypes'
import { mapFixtureStatus } from '@/lib/sportmonksConstants'
import { resolveSubstitutePositions } from '@/lib/subPositionAssignment'
import type { PipelineResult } from '@/lib/pipelineResult'

export async function syncFixtureStats(fixtureId: number): Promise<PipelineResult<{ playersSynced: number}>> {
    const { fixture, remaining } = await getFixtureDetail(fixtureId)

    await logApiCall(`fixtures/${fixtureId}`, 'SYNC_FIXTURES', {
        triggeredBy: 'scoring-sync',
        remainingAfterCall: remaining,
    })

    if (!fixture) {
        return { ok: false, status: 404, error: 'Fixture not found on Sportmonks' }
    }

    const homeFormationEntry = fixture.formations?.find(f => f.location === 'home')
    const awayFormationEntry = fixture.formations?.find(f => f.location === 'away')

    const currentScores = fixture.scores?.filter(s => s.description === 'CURRENT') ?? []
    const homeScoreEntry = currentScores.find(s => s.score.participant === 'home')
    const awayScoreEntry = currentScores.find(s => s.score.participant === 'away')

    await prisma.fixture.update({
        where: { id: fixture.id },
        data: {
            homeFormation: homeFormationEntry?.formation ?? null,
            awayFormation: awayFormationEntry?.formation ?? null,
            homeScore: homeScoreEntry?.score.goals ?? null,
            awayScore: awayScoreEntry?.score.goals ?? null,
            status: mapFixtureStatus(fixture.state_id),
        }
    })

    let synced = 0

    const positionByPlayerId = new Map<number, number | null>(
        fixture.lineups.map(l => [l.player_id, l.detailedposition?.id ?? null])
    )
    const subAssignments = resolveSubstitutePositions(fixture.events, positionByPlayerId)

    const manualOverrides = new Map(
        (await prisma.playerMatchStats.findMany({ 
            where: { fixtureId: fixture.id, positionManuallySet: true },
            select: { playerId: true, positionPlayedId: true },
        })).map(s => [s.playerId, s.positionPlayedId])
    )

    const knownPlayerIds = new Set(
        (await prisma.player.findMany({
            where: { id: { in: fixture.lineups.map(l => l.player_id) } },
            select: { id: true },
        })).map(p => p.id)
    )

    for (const lineup of fixture.lineups) {
        if (!knownPlayerIds.has(lineup.player_id)) {
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
        const positionPlayedId = manualOverrides.has(lineup.player_id)
            ? manualOverrides.get(lineup.player_id)
            : (lineup.detailedposition?.id ?? subAssignments.get(lineup.player_id) ?? null)

        await prisma.playerMatchStats.upsert({
            where: { playerId_fixtureId: { playerId: lineup.player_id, fixtureId: fixture.id } },
            update: {
                teamId: lineup.team_id,
                minutesPlayed,
                wasStarter,
                rating,
                positionPlayedId,
                stats: statsMap,
            },
            create: {
                playerId: lineup.player_id,
                fixtureId: fixture.id,
                teamId: lineup.team_id,
                minutesPlayed,
                wasStarter,
                rating,
                positionPlayedId,
                stats: statsMap,
            },
        })
        synced++
    }

    return { ok: true, playersSynced: synced}
}