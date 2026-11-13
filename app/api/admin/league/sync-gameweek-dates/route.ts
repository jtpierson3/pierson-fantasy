import { NextResponse } from 'next/server'
import { requireLeagueAdminOf } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { leagueId } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const gameweeks = await prisma.fantasyGameweek.findMany({
            where: { fantasyLeagueId: leagueId },
            orderBy: { gameweekNumber: 'asc' }
        })

        let updated = 0
        let skipped = 0

        for (const gw of gameweeks) {
            const fixtures = await prisma.fixture.findMany({
                where: {
                    competition: 'premier_league',
                    gameweekNumber: gw.gameweekNumber,
                },
                orderBy: { kickoff: 'asc' }
            })

            if (fixtures.length === 0) {
                skipped++
                continue
            }

            const startDate = fixtures[0].kickoff
            const endDate = fixtures[fixtures.length - 1].kickoff

            await prisma.fantasyGameweek.update({
                where: { id: gw.id },
                data: { startDate, endDate }
            })
            updated++
        }

        return NextResponse.json({ success: true, updated, skipped, total: gameweeks.length })
    } catch (err) {
        console.error('[sync-gameweek-dates] error:', err)
        return NextResponse.json({ error: 'Failed to sync gameweek dates' }, { status: 500 })
    }
}