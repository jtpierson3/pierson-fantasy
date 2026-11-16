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
        if (!q) return NextResponse.json({ players: [] })

        const matches = await prisma.player.findMany({
            where: {
                OR: [
                    { display_name: { contains: q, mode: 'insensitive' } },
                    { currentClubName: { contains: q, mode: 'insensitive' } }
                ]
            },
            include: { team: true },
            take: PLAYER_SEARCH_LIMIT,
            orderBy: { display_name: 'asc' }
        })

        return NextResponse.json({ players: matches.map(toPlayerSearchResult) })
    } catch (err) {
        console.error('[search-local-players] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}