import { NextResponse } from 'next/server'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { resolveGameweekLineups } from '@/lib/resolveGameweekLineups'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { gameweekId } = await req.json()
    if (!gameweekId) return NextResponse.json({ error: 'gameweekId is required' }, { status: 400 })

    try {
        const result = await resolveGameweekLineups(gameweekId)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
        return NextResponse.json({ success: true, teamsResolved: result.teamsResolved })
    } catch (err) {
        console.error('[resolve-gameweek-lineups] error: ', err)
        return NextResponse.json({ error: 'Failed to resolve gameweek lineups' }, { status: 500 })
    }
}