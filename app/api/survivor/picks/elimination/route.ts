import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'
import { PICKABLE_CONTESTANT_STATUSES } from '@/lib/leagueRules'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }
        const { user } = authResult

        const { survivorLeagueId, episodeId, contestantId } = await req.json() 
        if (
            typeof survivorLeagueId !== 'string' ||
            typeof episodeId !== 'string' ||
            typeof contestantId !== 'string'
        ) {
            return NextResponse.json({ error: 'survivorLeagueId, episodeId, and contestantId are required' }, { status: 400 })
        }

        const member = await prisma.survivorFantasyLeagueMember.findFirst({
            where: { userId: user.id, survivorLeagueId },
            include: { survivorLeague: { select: { survivorSeasonId: true } } },
        })
        if (!member) return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })

        const seasonId = member.survivorLeague.survivorSeasonId

        const episode = await prisma.episode.findFirst({
            where: { id: episodeId, survivorSeasonId: seasonId },
            select: { isAired: true },
        })
        if (!episode) return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
        if (episode.isAired) {
            return NextResponse.json({ error: 'Picks are locked - episode has started' }, { status: 400 })
        }

        const contestant = await prisma.contestant.findFirst({
            where: { id: contestantId, survivorSeasonId: seasonId, status: { in: PICKABLE_CONTESTANT_STATUSES } },
            select: { id: true },
        })
        if (!contestant) {
            return NextResponse.json({ error: 'That contestant is not available to pick' }, { status: 400 })
        }

        await prisma.eliminationPick.upsert({
            where: {
                userId_survivorLeagueId_episodeId: { userId: user.id, survivorLeagueId, episodeId },
            },
            update: { contestantId },
            create: { userId: user.id, survivorLeagueId, episodeId, contestantId },
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[elimination-pick] error:', err)
        return NextResponse.json({ error: 'Failed to save pick' }, { status: 500})
    }
}
