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

        const { leagueId, userId } = await req.json()

        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === leagueId && m.isAdmin
        )
        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if already a member
        const existing = await prisma.fantasyLeagueMember.findFirst({
            where: { userId, fantasyLeagueId: leagueId }
        })
        if (existing) {
            return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
        }

        await prisma.fantasyLeagueMember.create({
            data: {
                userId,
                fantasyLeagueId: leagueId,
                isAdmin: false,
            }
        })

        //Check to see if they have a team, if not create one
        const existingTeam = await prisma.fantasyTeam.findUnique({
            where: {
                userId_fantasyLeagueId: {
                    userId,
                    fantasyLeagueId: leagueId,
                }
            }
        })

        if (!existingTeam) {
            const newUser = await prisma.user.findUnique({ where: { id: userId } })
            await prisma.fantasyTeam.create({
                data: {
                    name: `${newUser?.username ?? 'New'}&aposs Team`,
                    userId,
                    fantasyLeagueId: leagueId
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[add-member] error: ', err)
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500})
    }
}