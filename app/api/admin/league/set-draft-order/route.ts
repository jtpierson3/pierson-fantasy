import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({
            where: { clerkId },
            include: { leagues: true }
        })
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { leagueId, orderedTeamIds } = await req.json()

        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === leagueId && m.isAdmin
        )
        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // OrderedTeamIds is the draft order - first pick to last pick
        // Invert it: last pick gets waiver priority 1, first pick gets last
        const total = orderedTeamIds.length

        await Promise.all(
            orderedTeamIds.map((teamId: string, i: number) => 
                prisma.fantasyTeam.update({
                    where: { id: teamId },
                    data: { draftPosition: i + 1 }
                })
            )
        )

        return NextResponse.json({ success: true , teamsUpdated: total })
    } catch (err) {
        console.error('[set-draft-order] error', err)
        return NextResponse.json({ error: 'Failed to set draft order' }, { status: 500 })
    }
}