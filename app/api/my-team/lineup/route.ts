import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { RosterSlot } from '@prisma/client'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, formation, players } = await req.json()

        // Verify team belongs to user
        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id }
        })
        if (!team) return NextResponse.json({ error: 'Team not Found' }, { status: 404 })

        // Update formation
        await prisma.fantasyTeam.update({
            where: { id: fantasyTeamId },
            data: { formation }
        })

        // Update each player's slot
        await Promise.all(
            players.map((p: { id: string; rosterSlot: string; slotOrder: number }) =>
                prisma.fantasyTeamPlayer.update({
                    where: { id: p.id },
                    data: {
                        rosterSlot: p.rosterSlot as RosterSlot,
                        slotOrder: p.slotOrder,
                    }
                })
            )
        )

        return NextResponse.json({ success: true})
    } catch (err) {
        console.error('[my-team/lineup] error:', err)
        return NextResponse.json({ error: 'Failed to save lineup' }, { status: 500 })
    }
}