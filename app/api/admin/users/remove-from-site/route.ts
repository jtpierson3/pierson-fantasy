import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSiteAdmin } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const currentUser = authResult.user

        const { userId } = await req.json()

        // Prevent self-deletion
        if (userId === currentUser.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        //Delete all related data in order
        await prisma.fantasyTeamPlayer.deleteMany({
            where: { fantasyTeam: { userId } }
        })
        await prisma.fantasyTeam.deleteMany({ where: { userId } })
        await prisma.fantasyLeagueMember.deleteMany({ where: { userId }})
        await prisma.user.delete({ where: { id: userId }})

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[remove-from-site] error:', err)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}