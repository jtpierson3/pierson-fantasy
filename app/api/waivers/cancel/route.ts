import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWaiverWindowStatus } from '@/lib/fixtureTiming'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        const user = authResult.user

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

        const windowStatus = await getWaiverWindowStatus(claim.fantasyTeam.fantasyLeagueId)
        if (windowStatus.state === 'closed') {
            return NextResponse.json({ error: 'The waiver window is closed' }, { status: 403 })
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