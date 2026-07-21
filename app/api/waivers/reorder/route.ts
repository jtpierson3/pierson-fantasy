import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { fantasyTeamId, orderedClaimIds } = await req.json()

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id }
        })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        
        await Promise.all(
            orderedClaimIds.map((claimId: string, index: number) =>
                prisma.waiverClaim.update({
                    where: { id: claimId },
                    data: { rank: index + 1 }
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[waivers/reorder] error:', err)
        return NextResponse.json({ error: 'Failed to reorder claims.' }, { status: 500 })
    }
}