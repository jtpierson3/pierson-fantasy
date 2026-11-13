import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeagueAdminOf } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const { userId, leagueId } = await req.json()

        //Verify current user is admin of this league
        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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