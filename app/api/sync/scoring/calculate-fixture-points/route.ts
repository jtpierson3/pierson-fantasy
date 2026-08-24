import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { calculatePlayerPoints, type ScoringRuleInput, type PlayerStatsInput } from '@/lib/scoringCalculation'
import { qualifiesForCleanSheet } from '@/lib/scoringRules'
import { getPositionType } from '@/lib/formations'

function toScoringPosition(positionType: string | null): 'ST' | 'WM' | 'DEF' | 'GK' | null {
    if (positionType === 'ST') return 'ST'
    if (positionType === 'W' || positionType === 'CM') return 'WM'
    if (positionType === 'CB' || positionType === 'FB') return 'DEF'
    if (positionType === 'GK') return 'GK'
    return null
}

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

        // Determine which team conceded which - needed for clean sheet calc
        const homeGoalsConceded = fixture.awayScore ?? 0
        const awayGoalsConceded = fixture.homeScore ?? 0

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

        for (const ps of allStats) {
            const broadPositionId = ps.positionPlayedId === 24 ? 24 : null
            const positionType = getPositionType(ps.positionPlayedId, broadPositionId)
            const scoringPosition = toScoringPosition(positionType)
            if (!scoringPosition) continue // skip players with no resolvable position

            const rules = rulesByPosition.get(scoringPosition) ?? []

            const teamGoalsConceded = ps.player.teamId == fixture.homeTeamId ? homeGoalsConceded : awayGoalsConceded
            const isCleanSheet = qualifiesForCleanSheet(teamGoalsConceded, ps.minutesPlayed)

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

        return NextResponse.json({ success: true, playersCalculated: calculated })
    } catch (err) {
        console.error('[calculate-fixture-points] error:', err)
        return NextResponse.json({ error: 'Failed to calculate fixture points' }, { status: 500 })
    }
}