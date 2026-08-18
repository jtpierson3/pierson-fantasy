import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { getGameweekLockTime } from '@/lib/fixtureTiming'

export async function GET(req: Request) {
    const authResult = requireAutomationSecret(req)
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

    try {
        // Find the earliest gameweek (across any league) that hasn't started yet
        const allGameweeks = await prisma.fantasyGameweek.findMany({
            where: { isComplete: false },
            orderBy: { gameweekNumber: 'asc' },
            select: { gameweekNumber: true, startDate: true, endDate: true, id: true }
        })

        for (const gw of allGameweeks) {
            const lockTime = await getGameweekLockTime(gw.startDate, gw.endDate)
            if (!lockTime) continue

            const now = new Date()
            const windowStart = new Date(lockTime.getTime() - 24 * 60 * 60 * 1000)

            if (now >= windowStart && now < lockTime) {
                // We are inside the 24 hour pregameweek window - check if we've already run
                // the sync for specific gameweek
                const alreadySynced = await prisma.apiCallLog.findFirst({
                    where: {
                        source: 'SYNC_PLAYERS',
                        triggeredBy: `pregameweek-${gw.gameweekNumber}`,
                    }
                })

                if (!alreadySynced) {
                    return NextResponse.json({ shouldRun: true, gameweekNumber: gw.gameweekNumber })
                }
            }
        }

        return NextResponse.json({ shouldRun: false })
    } catch (err) {
        console.error('[should-run-pregameweek-sync] error: ', err)
        return NextResponse.json({ error: 'Failed to check sync timing' }, { status: 500 })
    }
}