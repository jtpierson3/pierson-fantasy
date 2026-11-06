import { NextResponse } from 'next/server'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { syncFixtureStats } from '@/lib/syncFixtureStats'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { fixtureId } = await req.json()
    if (!fixtureId) return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 })

    try {
        const result = await syncFixtureStats(fixtureId)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
        return NextResponse.json({ success: true, playersSynced: result.playersSynced })
    } catch (err) {
        console.error('[sync-fixture-stats] error: ', err)
        return NextResponse.json({ error: 'Failed to sync fixture stats' }, { status: 500 })
    }
}