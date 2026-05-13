import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { seasonId } = await req.json()

        // Delete in order
        await prisma.episodeStat.deleteMany({
            where: { episode: { survivorSeasonId: seasonId }}
        })
        await prisma.survivorPicks.deleteMany({
            where: { contestant: { survivorSeasonId: seasonId }}
        })
        await prisma.tribeMembership.deleteMany({
            where: { tribe: { survivorSeasonId: seasonId }}
        })
        await prisma.tribe.deleteMany({
            where: { survivorSeasonId: seasonId }
        })
        await prisma.contestant.deleteMany({
            where: { survivorSeasonId: seasonId }
        })
        await prisma.episode.deleteMany({
            where: { survivorSeasonId: seasonId }
        })
        await prisma.scoringEvent.deleteMany({
            where: { survivorSeasonId: seasonId }
        })
        await prisma.survivorSeason.deleteMany({
            where: { id: seasonId }
        })

        return NextResponse.json({ success: true })
        
    } catch (err) {
        console.error('[delete-season] error:', err)
        return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 })
    }
}