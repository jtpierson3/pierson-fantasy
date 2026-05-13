import { NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const currentUser = await prisma.user.findUnique({
            where: { clerkId },
            include: { leagues: true}
        })
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { leagueId, name, description } = await req.json()

        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === leagueId && m.isAdmin
        )
        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.fantasyLeague.update({
            where: { id: leagueId },
            data: { name, description: description || null }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-league] error: ', err)
        return NextResponse.json({ error: 'Failed to update league' }, { status: 500})
    }
}