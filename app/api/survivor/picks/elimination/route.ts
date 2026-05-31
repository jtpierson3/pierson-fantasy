import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { survivorLeagueId, episodeId, contestantId } = await req.json() 

        // Check episode hasn't aired yet
        const episode = await prisma.episode.findUnique({
            where: { id: episodeId },
            select: { isAired: true, isFinale: true }
        })

        if (!episode) return NextResponse.json({ error: 'Episode Not Found' }, { status: 404 })
        if (episode.isAired) return NextResponse.json({ error: 'Picks are locked - epsiode has started.' }, { status: 400 })

        const member = await prisma.survivorFantasyLeagueMember.findFirst({
            where: { userId: user.id, survivorLeagueId }
        })
        if (!member) return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })

        await prisma.eliminationPick.upsert({
            where: {
                userId_survivorLeagueId_episodeId: {
                    userId: user.id,
                    survivorLeagueId,
                    episodeId,
                }
            },
            update: { contestantId },
            create: {
                userId: user.id,
                survivorLeagueId,
                episodeId,
                contestantId
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[elimination-pick] error:', err)
        return NextResponse.json({ error: 'Failed to save pick' }, { status: 500})
    }
}
