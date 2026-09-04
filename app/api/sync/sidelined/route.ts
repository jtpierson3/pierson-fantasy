import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COMPETITIONS } from '@/lib/sportmonksConstants'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { syncTeamSidelined } from '@/lib/sidelinedSync'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    let triggeredBySource = 'sync-sidelined'
    try {
        const body = await req.json()
        if (body?.triggeredBySource) triggeredBySource = body.triggeredBySource
    } catch {
        // Fine
    }

    const teams = await prisma.team.findMany({
        where: { leagueId: COMPETITIONS.premier_league.leagueId },
        select: { id: true, name: true },
    })

    const errors: { team: string; message: string }[] = []
    let totalSynced = 0

    for (const team of teams) {
        try {
            totalSynced += await syncTeamSidelined(team.id, triggeredBySource)
        } catch (err) {
            errors.push({ team: team.name, message: err instanceof Error ? err.message : 'Unknown error' })
        }
    }

    return NextResponse.json({
        success: errors.length === 0,
        message: `${totalSynced} sidelined entr${totalSynced === 1 ? 'y' : 'ies'} synced across ${teams.length} team(s)`,
        synced: totalSynced,
        errors,
    })
}