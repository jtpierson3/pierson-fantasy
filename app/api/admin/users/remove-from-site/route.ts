import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const currentUser = await prisma.user.findUnique({
            where: { clerkId }
        })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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