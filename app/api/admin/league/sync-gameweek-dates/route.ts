import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({
            where: { clerkId },
            include: { leagues: true }
        })
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { leagueId } = await req.json()

        const isLeagueAdmin = currentUser.leagues.some(
            m => m.fantasyLeagueId === leagueId && m.isAdmin
        )

        if (!isLeagueAdmin && !currentUser.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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