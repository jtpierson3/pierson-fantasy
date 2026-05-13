import { NextResponse } from "next/server"
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
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { memberId, isAdmin } = await req.json()

        const member = await prisma.fantasyLeagueMember.findUnique({
            where: { id: memberId }
        })
        if (!member) return NextResponse.json({ error: 'Member nto found' }, { status: 404})
            
        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === member.fantasyLeagueId && m.isAdmin
        )
        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.fantasyLeagueMember.update({
            where: { id: memberId },
            data: { isAdmin }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[toggle-admin] error: ', err)
        return NextResponse.json({ error: 'Failed to create update admin status' }, { status: 500})
    }
}