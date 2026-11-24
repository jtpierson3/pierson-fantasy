import { NextResponse } from 'next/server'
import { requireLeagueAdminOf } from '@/lib/apiAuth'
import { syncGameweekDates } from '@/lib/gameweekDateSync'

export async function POST(req: Request) {
    try {
        const { leagueId } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const result = await syncGameweekDates(leagueId)

        return NextResponse.json({ success: true, ...result })
    } catch (err) {
        console.error('[sync-gameweek-dates] error:', err)
        return NextResponse.json({ error: 'Failed to sync gameweek dates' }, { status: 500 })
    }
}