import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, notes } = await req.json()

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id }
        })
        if (!team) return NextResponse.json({ error: 'Team not Found' }, { status: 404 })

        await prisma.fantasyTeam.update({
            where: { id: fantasyTeamId },
            data: { lineupNotes: notes }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[my-team/notes] error:', err)
        return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
    }
}