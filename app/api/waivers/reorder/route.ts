import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const authResult = await requireUser()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }
        const { user } = authResult

        const { fantasyTeamId, orderedClaimIds } = await req.json()
        if (
            typeof fantasyTeamId !== 'string' ||
            !Array.isArray(orderedClaimIds) ||
            !orderedClaimIds.every((id): id is string => typeof id === 'string')
        ) {
            return NextResponse.json({ error: 'fantasyTeamId and orderedClaimIds are required' }, { status: 400 })
        }

        const team = await prisma.fantasyTeam.findFirst({
            where: { id: fantasyTeamId, userId: user.id }
        })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        const pendingClaims = await prisma.waiverClaim.findMany({
            where: { fantasyTeamId: team.id, status: 'pending' },
            select: { id: true },
        })
        const pendingIds = new Set(pendingClaims.map(c => c.id))
        const submittedIds = new Set<string>(orderedClaimIds)

        const matchesExactly =
            submittedIds.size === orderedClaimIds.length &&
            submittedIds.size === pendingIds.size &&
            orderedClaimIds.every(id => pendingIds.has(id))

        if (!matchesExactly) {
            return NextResponse.json({ error: 'Claims changed = refresh and try again' }, { status: 400 })
        }
        
        await prisma.$transaction(
            orderedClaimIds.map((claimId, index) =>
                prisma.waiverClaim.update({
                    where: { id: claimId },
                    data: { rank: index + 1 },
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[waivers/reorder] error:', err)
        return NextResponse.json({ error: 'Failed to reorder claims.' }, { status: 500 })
    }
}