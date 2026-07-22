import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({ where: { clerkId } })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { claimId } = await req.json()

        const claim = await prisma.waiverClaim.findUnique({
            where: { id: claimId },
            include: { fantasyTeam: true }
        })

        if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
        if (claim.fantasyTeam.userId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401})
        }
        if (claim.status !== 'pending') {
            return NextResponse.json({ error: 'Only pending claims can be cancelled' }, { status: 400})
        }

        await prisma.waiverClaim.delete({ where: { id: claimId } })

        //Re-rank this team's remaining claims to close the gap left behind
        const remaining = await prisma.waiverClaim.findMany({
            where: { fantasyTeamId: claim.fantasyTeamId, status: 'pending' },
            orderBy: { rank: 'asc' }
        })

        await Promise.all(
            remaining.map((c, index) =>
                prisma.waiverClaim.update({
                    where: { id: c.id },
                    data: { rank: index + 1 }
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[waivers/cancel] error:', err)
        return NextResponse.json({ error: 'Failed to cancel claim' }, { status: 500 })
    }
}