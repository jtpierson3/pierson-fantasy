import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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