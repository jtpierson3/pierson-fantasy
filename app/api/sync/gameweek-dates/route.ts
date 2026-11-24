import { NextResponse } from 'next/server'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { syncGameweekDates } from '@/lib/gameweekDateSync'

export async function POST(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    try {
        const result = await syncGameweekDates()

        return NextResponse.json({ success: true, ...result })
    } catch (err) {
        console.error('[sync/gameweek-dates] error:', err)
        return NextResponse.json({ success: false, error: 'Failed to sync gameweek dates' }, { status: 500 })
    }
}