import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'
import { recalculatePlayerFixturePoints, RecalculationError } from '@/lib/playerFixturePointsRecalculation'
import { resolveAndPersistLineup } from '@/lib/gameweekLineupResolution'
import { resolveCupGameweekPoints } from '@/lib/cupScoring'

export async function POST(req: Request) {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { playerMatchStatsId, positionPlayedId } = await req.json()
    if (!playerMatchStatsId || typeof positionPlayedId !== 'number') {
        return NextResponse.json({ error: 'playerMatchStatsId and positionPlayedId are required' }, { status: 400 })
    }

    try {
        const { points, breakdown, playerId, gameweekNumber } = 
            await recalculatePlayerFixturePoints(playerMatchStatsId, positionPlayedId, { manual: true })
        
        let teamsReResolved = 0

        if (gameweekNumber != null) {
            const gameweeks = await prisma.fantasyGameweek.findMany({
                where: { gameweekNumber },
                select: { id: true, competition: true }
            })

            const plGameweekIds = gameweeks.filter(g => g.competition === 'premier_league').map(g => g.id)
            const cupGameweeks = gameweeks.filter(g => g.competition !== 'premier_league')

            if (plGameweekIds.length > 0) {
                const affectedLineups = await prisma.gameweekLineup.findMany({
                    where: {
                        gameweekId: { in: plGameweekIds },
                        players: { some: { playerId } }
                    },
                    select: { fantasyTeamId: true, gameweekId: true }
                })

                for (const l of affectedLineups) {
                    const resolved = await resolveAndPersistLineup(l.fantasyTeamId, l.gameweekId)
                    if (resolved) teamsReResolved++
                }
            }

            for (const gw of cupGameweeks) {
                const affectedTeam = await prisma.fantasyTeamPlayer.findFirst({
                    where: {
                        playerId,
                        fantasyTeam: { fantasyLeague: { gameweeks: { some: { id: gw.id } } } }
                    },
                    select: { fantasyTeamId: true }
                })
                if (affectedTeam) {
                    await resolveCupGameweekPoints(affectedTeam.fantasyTeamId, gw.id)
                    teamsReResolved++
                }
            }
        }

        return NextResponse.json({ success: true, points, breakdown, teamsReResolved })
    } catch (err) {
        if (err instanceof RecalculationError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('[correct-position] error:', err)
        return NextResponse.json({ error: 'Failed to recalculate points' }, { status: 500 })
    }
}