import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function GET(req: Request) {
    const authResult = await requireUser()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    const { user } = authResult

    const { searchParams } = new URL(req.url)
    const fantasyLeagueId = searchParams.get('leagueId')
    const gameweekId = searchParams.get('gameweekId')

    if (!fantasyLeagueId || !gameweekId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const myTeam = await prisma.fantasyTeam.findFirst({
        where: { userId: user.id, fantasyLeagueId },
        select: { id: true }
    })
    if (!myTeam) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const matchup = await prisma.fantasyMatchup.findFirst({
        where: {
            gameweekId,
            OR: [
                { homeTeamId: myTeam.id },
                { awayTeamId: myTeam.id }
            ]
        },
        select: { id: true }
    })

    if (!matchup) return NextResponse.json({ error: 'No matchup found for that gameweek' }, { status: 404 })

    return NextResponse.json({ matchupId: matchup.id })
}