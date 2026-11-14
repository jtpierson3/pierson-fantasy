import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function GET(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q') ?? ''
        const fantasyLeagueId = searchParams.get('fantasyLeagueId')

        if (!fantasyLeagueId || q.length < 2) {
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
            take: 10,
            orderBy: { display_name: 'asc'}
        })

        return NextResponse.json({ players })
    } catch (err) {
        console.error('[waivers/search-players] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}