import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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