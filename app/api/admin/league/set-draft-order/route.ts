import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeagueAdminOf } from '@/lib/apiAuth'

export async function POST(req: Request) {
    try {
        const { leagueId, orderedTeamIds } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        // OrderedTeamIds is the draft order - first pick to last pick
        // Invert it: last pick gets waiver priority 1, first pick gets last
        const total = orderedTeamIds.length

        await Promise.all(
            orderedTeamIds.map((teamId: string, i: number) => 
                prisma.fantasyTeam.update({
                    where: { id: teamId },
                    data: { draftPosition: i + 1 }
                })
            )
        )

        return NextResponse.json({ success: true , teamsUpdated: total })
    } catch (err) {
        console.error('[set-draft-order] error', err)
        return NextResponse.json({ error: 'Failed to set draft order' }, { status: 500 })
    }
}