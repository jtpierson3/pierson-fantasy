import { NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json( { error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({
            where: { clerkId },
            include: { leagues: true}
        })
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { userId, leagueId } = await req.json()

        //Verify current user is admin of this league
        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === leagueId && m.isAdmin
        )
        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Delete their fantasy team and players first
        const team = await prisma.fantasyTeam.findFirst({
            where: { userId, fantasyLeagueId: leagueId }
        })

        if (team) {
            await prisma.fantasyTeamPlayer.deleteMany({
                where: { fantasyTeamId: team.id }
            })
            await prisma.fantasyTeam.delete({
                where: { id: team.id }
            })
        }

        //Remove from League
        await prisma.fantasyLeagueMember.deleteMany({
            where: { userId, fantasyLeagueId: leagueId}
        })

        return NextResponse.json({ success: true})
    } catch (err) {
        console.error('[remove-from-league] error:', err)
        return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 })
    }
}