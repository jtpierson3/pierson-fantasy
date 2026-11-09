import { prisma } from '@/lib/prisma'
import { groupRulesByPosition, scorePlayerMatchStats } from '@/lib/fixturePointsScoring'
import type { PipelineResult } from '@/lib/pipelineResult'

export async function calculateFixturePoints(
    fixtureId: number
): Promise<PipelineResult<{ playersCalculated: number; playersSkipped: number }>> {
    const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } })
    if (!fixture) return { ok: false, status: 404, error: 'fixture not found' }

    const allStats = await prisma.playerMatchStats.findMany({
        where: { fixtureId },
        include: { player: true },
    })

    if (allStats.length === 0) {
        return { ok: false, status: 400, error: 'No stats synced for this fixture yet - run sync fixture-stats first' }
    }

    const allRules = await prisma.scoringRule.findMany({ where: { isActive: true } })
    const rulesByPosition = groupRulesByPosition(allRules)

    let calculated = 0
    const skippedPlayerIds: number[] = []

    for (const playerStat of allStats) {
        const result = scorePlayerMatchStats({
            positionPlayedId: playerStat.positionPlayedId,
            matchTeamId: playerStat.teamId,
            playerClubId: playerStat.player.teamId,
            fixture,
            stats: playerStat.stats,
            rating: playerStat.rating,
            minutesPlayed: playerStat.minutesPlayed,
            rulesByPosition,
        })

        if (!result.scored) {
            if (playerStat.minutesPlayed > 0) skippedPlayerIds.push(playerStat.playerId)
            continue
        }

        if (result.sideUnknown) {
            console.warn(`[calculate-fixture-points] can't tell which side player ${playerStat.playerId} played for in fixture ${fixtureId} - no clean sheet awarded`)
        }

        await prisma.playerFixturePoints.upsert({
            where: { playerId_fixtureId: { playerId: playerStat.playerId, fixtureId } },
            update: { points: result.totalPoints, breakdown: result.breakdown },
            create: { playerId: playerStat.playerId, fixtureId, points: result.totalPoints, breakdown: result.breakdown },
        })
        calculated++
    }

    if (skippedPlayerIds.length > 0) {
        console.warn(`[calculate-fixture-points] fixture ${fixtureId}: ${skippedPlayerIds.length} player(s) who played had no resolvable position and were not scored: ${skippedPlayerIds.join(', ')}`)
    }

    return { ok: true, playersCalculated: calculated, playersSkipped: skippedPlayerIds.length }
}
