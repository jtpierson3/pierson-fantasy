import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const user = authResult.user

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