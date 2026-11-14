import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function GET(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim()
        if (!q || q.length < 2) return NextResponse.json({ players: [] })

        const matches = await prisma.player.findMany({
            where: {
                OR: [
                    { display_name: { contains: q, mode: 'insensitive' } },
                    { currentClubName: { contains: q, mode: 'insensitive' } }
                ]
            },
            include: { team: true },
            take: 10,
            orderBy: { display_name: 'asc' }
        })

        return NextResponse.json({
            players: matches.map(p => ({
                id: p.id,
                display_name: p.display_name,
                image_path: p.image_path,
                team: p.team ? { id: p.team.id, name: p.team.name, image_path: p.team.image_path, leagueId: p.team.leagueId } : null,
                currentClubName: p.currentClubName
            }))
        })
    } catch (err) {
        console.error('[search-local-players] error:', err)
        return NextResponse.json({ error: 'Failed to search players' }, { status: 500 })
    }
}