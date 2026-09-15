import { NextResponse } from 'next/server'
import { requireSiteAdmin } from '@/lib/apiAuth'
import { recalculatePlayerFixturePoints, RecalculationError } from '@/lib/playerFixturePointsRecalculation'

export async function POST(req: Request) {
    const authResult = await requireSiteAdmin()
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    const { playerMatchStatsId, positionPlayedId } = await req.json()
    if (!playerMatchStatsId || typeof positionPlayedId !== 'number') {
        return NextResponse.json({ error: 'playerMatchStatsId and positionPlayedId are required' }, { status: 400 })
    }

    try {
        const { points, breakdown } = await recalculatePlayerFixturePoints(playerMatchStatsId, positionPlayedId, { manual: true })
        return NextResponse.json({ success: true, points, breakdown })
    } catch (err) {
        if (err instanceof RecalculationError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('[correct-position] error:', err)
        return NextResponse.json({ error: 'Failed to recalculate points' }, { status: 500 })
    }
}