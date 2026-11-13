import { NextResponse } from 'next/server'
import { requireLeagueAdminOf } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { leagueId, userId } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

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
                    name: `${newUser?.username ?? 'New'}'s Team`,
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