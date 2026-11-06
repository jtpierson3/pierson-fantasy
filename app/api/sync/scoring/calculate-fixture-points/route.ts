import { NextResponse } from 'next/server'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { calculateFixturePoints } from '@/lib/calculateFixturePoints'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { fixtureId } = await req.json()
    if (!fixtureId) return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 })

    try {
        const result = await calculateFixturePoints(fixtureId)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
        return NextResponse.json({
            success: true,
            playersCalculated: result.playersCalculated,
            playersSkipped: result.playersSkipped,
        })
    } catch (err) {
        console.error('[calculate-fixture-points] error: ', err)
        return NextResponse.json({ error: 'Failed to calculate fixture points' }, { status: 500 })
    }
}