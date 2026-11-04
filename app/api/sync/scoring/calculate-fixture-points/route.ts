import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { calculatePlayerPoints, type ScoringRuleInput, type PlayerStatsInput } from '@/lib/scoringCalculation'
import { qualifiesForCleanSheet } from '@/lib/scoringRules'
import { getPositionType, toScoringPosition } from '@/lib/formations'
import { getTeamGoalsConceded } from '@/lib/goalsConceded'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { fixtureId } = await req.json()
    if (!fixtureId) return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 })

    try {
        const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId } })
        if (!fixture) return NextResponse.json({ error: 'fixture not found' }, { status: 404 })

        const allStats = await prisma.playerMatchStats.findMany({
            where: { fixtureId },
            include: { player: true }
        })

        if (allStats.length === 0) {
            return NextResponse.json({ error: 'No stats synced for this fixture yet - run sync fixture-stats first' }, { status: 400 })
        }

        const allRules = await prisma.scoringRule.findMany({ where: { isActive: true } })
        const rulesByPosition = new Map<string, ScoringRuleInput[]>()
        for (const r of allRules) {
            const list = rulesByPosition.get(r.position) ?? []
            list.push({
                statKey: r.statKey,
                displayName: r.displayName,
                statTypeId: r.statTypeId,
                position: r.position,
                pointsPerUnit: r.pointsPerUnit,
                isGraduated: r.isGraduated,
                tiers: r.tiers as { min: number; points: number }[] | null,
            })
            rulesByPosition.set(r.position, list)
        }

        let calculated = 0
        const skippedPlayerIds: number[] = []

        for (const ps of allStats) {
            const broadPositionId = ps.positionPlayedId === 24 ? 24 : null
            const positionType = getPositionType(ps.positionPlayedId, broadPositionId)
            const scoringPosition = toScoringPosition(positionType)
            if (!scoringPosition) {
                if (ps.minutesPlayed > 0) skippedPlayerIds.push(ps.playerId)
                continue
            }

            const rules = rulesByPosition.get(scoringPosition) ?? []

            const goalsConceded = getTeamGoalsConceded({
                matchTeamId: ps.teamId,
                fallbackTeamId: ps.player.teamId,
                fixture,
            })
            if (goalsConceded === null && ps.minutesPlayed > 0) {
                console.warn(`[calculate-fixture-points] can't tell which side player ${ps.playerId} played for in fixture ${fixtureId} - no clean sheet awarded`)
            }
            const isCleanSheet = goalsConceded !== null && qualifiesForCleanSheet(goalsConceded, ps.minutesPlayed)

            const statsInput: PlayerStatsInput = {
                stats: (ps.stats as Record<string, number>) ?? {},
                rating: ps.rating,
                minutesPlayed: ps.minutesPlayed,
            }

            const { totalPoints, breakdown } = calculatePlayerPoints(statsInput, rules, isCleanSheet)

            await prisma.playerFixturePoints.upsert({
                where: { playerId_fixtureId: { playerId: ps.playerId, fixtureId } },
                update: { points: totalPoints, breakdown },
                create: { playerId: ps.playerId, fixtureId, points: totalPoints, breakdown }
            })
            calculated++
        }

        if (skippedPlayerIds.length > 0) {
            console.warn(`[calculate-fixture-points] fixture ${fixtureId}: ${skippedPlayerIds.length} player(s) who played had no resolvable position and were not scored: ${skippedPlayerIds.join(', ')}`)
        }

        return NextResponse.json({ success: true, playersCalculated: calculated, playersSkipped: skippedPlayerIds.length, })
    } catch (err) {
        console.error('[calculate-fixture-points] error:', err)
        return NextResponse.json({ error: 'Failed to calculate fixture points' }, { status: 500 })
    }
}