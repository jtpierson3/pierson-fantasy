import { prisma } from '@/lib/prisma'
import { calculatePlayerPoints, type ScoringRuleInput, type PlayerStatsInput } from '@/lib/scoringCalculation'
import { qualifiesForCleanSheet } from '@/lib/scoringRules'
import { getPositionType, toScoringPosition } from '@/lib/formations'
import { getTeamGoalsConceded } from '@/lib/goalsConceded'
import type { PipelineResult } from '@/lib/pipelineResult'

export async function calculateFixturePoints(
    fixtureId: number
): Promise<PipelineResult< { playersCalculated: number; playersSkipped: number}>> {
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
    const rulesByPosition = new Map<string, ScoringRuleInput[]>()
    for (const rule of allRules) {
        const list = rulesByPosition.get(rule.position) ?? []
        list.push({
            statKey: rule.statKey,
            displayName: rule.displayName,
            statTypeId: rule.statTypeId,
            position: rule.position,
            pointsPerUnit: rule.pointsPerUnit,
            isGraduated: rule.isGraduated,
            tiers: rule.tiers as { min: number; points: number }[] | null,
        })
        rulesByPosition.set(rule.position, list)
    }

    let calculated = 0
    const skippedPlayerIds: number[] = []

    for (const playerStat of allStats) {
        const broadPositionId = playerStat.positionPlayedId === 24 ? 24 : null
        const positionType = getPositionType(playerStat.positionPlayedId, broadPositionId)
        const scoringPosition = toScoringPosition(positionType)
        if (!scoringPosition) {
            if (playerStat.minutesPlayed > 0) skippedPlayerIds.push(playerStat.playerId)
            continue
        }

        const rules = rulesByPosition.get(scoringPosition) ?? []

        const goalsConceded = getTeamGoalsConceded({
            matchTeamId: playerStat.teamId,
            fallbackTeamId: playerStat.player.teamId,
            fixture,
        })
        if (goalsConceded === null && playerStat.minutesPlayed > 0) {
            console.warn(`[calculate-fixture-points] can't tell which side player ${playerStat.playerId} played for in fixture ${fixtureId} - no clean sheet awarded`)
        }
        const isCleanSheet = goalsConceded !== null && qualifiesForCleanSheet(goalsConceded, playerStat.minutesPlayed)

        const statsInput: PlayerStatsInput = {
            stats: (playerStat.stats as Record<string, number>) ?? {},
            rating: playerStat.rating,
            minutesPlayed: playerStat.minutesPlayed,
        }

        const { totalPoints, breakdown } = calculatePlayerPoints(statsInput, rules, isCleanSheet)

        await prisma.playerFixturePoints.upsert({
            where: { playerId_fixtureId: { playerId: playerStat.playerId, fixtureId } },
            update: { points: totalPoints, breakdown },
            create: { playerId: playerStat.playerId, fixtureId, points: totalPoints, breakdown },
        })
        calculated++
    }

    if (skippedPlayerIds.length > 0) {
        console.warn(`[calculate-fixture-points] fixture ${fixtureId}: ${skippedPlayerIds.length} player(s) who played had no resolvable position and were not scored: ${skippedPlayerIds.join(', ')}`)
    }

    return { ok: true, playersCalculated: calculated, playersSkipped: skippedPlayerIds.length }
}