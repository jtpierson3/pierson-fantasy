import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const { user } = authResult

        const { fantasyTeamId, playerId } = await req.json()

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id }
        })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        const rosterEntry = await prisma.fantasyTeamPlayer.findFirst({
            where: { fantasyTeamId, playerId }
        })
        if (!rosterEntry) return NextResponse.json({ error: 'Player is not on your roster' }, { status: 400 })

        await prisma.$transaction(async tx => {
            await tx.fantasyTeamPlayer.delete({ where: { id: rosterEntry.id } })

            // Any of this team's own pending claims that specified this player as their drop target
            // Now just become a straight add, since the player is already gone. 
            await tx.waiverClaim.updateMany({
                where: {
                    fantasyTeamId,
                    playerToDropId: playerId,
                    status: 'pending',
                },
                data: { playerToDropId: null }
            })
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[roster/drop] error:', err)
        return NextResponse.json({ error: 'Failed to drop player' }, { status: 500 })
    }
}