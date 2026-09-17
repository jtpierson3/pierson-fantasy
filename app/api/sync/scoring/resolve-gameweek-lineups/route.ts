import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { resolveAndPersistLineup } from '@/lib/gameweekLineupResolution'
import { resolveCupGameweekForAllTeams } from '@/lib/cupScoring'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { gameweekId } = await req.json()
    if (!gameweekId) return NextResponse.json({ error: 'gameweekId is required' }, { status: 400 })

    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: { id: gameweekId }
    })
    if (!gameweek) return NextResponse.json({ error: 'Gameweek not found' }, { status: 404 })

    if (gameweek.competition !== 'premier_league') {
        const resolvedCount = await resolveCupGameweekForAllTeams(gameweekId)
        return NextResponse.json({ success: true, teamsResolved: resolvedCount })
    }

    try {
        const lineups = await prisma.gameweekLineup.findMany({
            where: { gameweekId },
            select: { fantasyTeamId: true }
        })

        let resolvedCount = 0
        for (const lineup of lineups) {
            const resolved = await resolveAndPersistLineup(lineup.fantasyTeamId, gameweekId)
            if (resolved) resolvedCount++
        }

        return NextResponse.json({ success: true, teamsResolved: resolvedCount })
    } catch (err) {
        console.error('[resolve-gameweek-lineups] error:', err)
        return NextResponse.json({ error: 'Failed to resolve gameweek lineups' }, { status: 500 })
    }
}