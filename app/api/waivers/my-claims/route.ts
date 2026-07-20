import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            
        const { searchParams } = new URL(req.url)
        const fantasyTeamId = searchParams.get('fantasyTeamId')
        if (!fantasyTeamId) return NextResponse.json({ claims: [] })

        const myTeam = await prisma.fantasyTeam.findUnique({ where: { id: fantasyTeamId } })
        if (!myTeam) return NextResponse.json({ claims: [] })

        const myClaims = await prisma.waiverClaim.findMany({
            where: { fantasyTeamId, status: 'pending' },
            include: {
                playerToAdd: { include: { team: true } },
                playerToDrop: true
            },
            orderBy: { submittedAt: 'desc' }
        })

        // For each claim find all competing claims on the same player in the same league
        const claimsWithStatus = await Promise.all(
            myClaims.map(async claim => {
                const competingClaims = await prisma.waiverClaim.findMany({
                    where: {
                        playerToAddId: claim.playerToAddId,
                        status: 'pending',
                        fantasyTeam: { fantasyLeagueId: myTeam.fantasyLeagueId }
                    },
                    include: { fantasyTeam: true }
                })

                const bestPriority = Math.min(...competingClaims.map(c => c.fantasyTeam.waiverPriority))
                const isLeading = myTeam.waiverPriority === bestPriority

                return {
                    id: claim.id,
                    status: claim.status,
                    submittedAt: claim.submittedAt.toISOString(),
                    player: {
                        id: claim.playerToAdd.id,
                        display_name: claim.playerToAdd.display_name,
                        image_path: claim.playerToAdd.image_path
                    },
                    playerToDrop: claim.playerToDrop
                        ? { display_name: claim.playerToDrop.display_name }
                        : null,
                    isLeading,
                    competingClaimsCount: competingClaims.length
                }
            })
        )

        return NextResponse.json({ claims: claimsWithStatus })
    } catch (err) {
        console.error('[waivers/my-claims] error:', err)
        return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 })
    }
}