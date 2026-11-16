import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'
import { normalizeSearchQuery, toPlayerSearchResult, PLAYER_SEARCH_LIMIT } from '@/lib/playerSearch'

export async function GET(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { searchParams } = new URL(req.url)
        const q = normalizeSearchQuery(searchParams.get('q'))
        const fantasyLeagueId = searchParams.get('fantasyLeagueId')

        if (!fantasyLeagueId || !q) {
            return NextResponse.json({ players: [] })
        }

        const rosteredPlayerIds = (
            await prisma.fantasyTeamPlayer.findMany({
                where: { fantasyTeam: { fantasyLeagueId } },
                select: { playerId: true }
            })
        ).map(p => p.playerId)

        const players = await prisma.player.findMany({
            where: {
                display_name: { contains: q, mode: 'insensitive'},
                id: { notIn: rosteredPlayerIds }
            },
            include: { team: true },
            take: PLAYER_SEARCH_LIMIT,
            orderBy: { display_name: 'asc'}
        })

        return NextResponse.json({ players: players.map(toPlayerSearchResult) })
    } catch (err) {
        console.error('[waivers/search-players] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}