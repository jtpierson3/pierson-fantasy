import { prisma } from '@/lib/prisma'

export type GameweekDateRange = { startDate: Date; endDate: Date }

/**
 * Given the kickoff's of a gameweek's fixtures, returns the date range the
 * FantasyGameweek should span: earliest kickoff to the latest kickoff.
 * Returns null when there are no fixtures (nothing to sync from).
 * 
 * Order-independent, so callers don't need to sort first.
 */
export function computeGameweekDateRange(kickoffs: Date[]): GameweekDateRange | null {
    if (kickoffs.length === 0) return null

    const times = kickoffs.map(k => k.getTime())
    return {
        startDate: new Date(Math.min(...times)),
        endDate: new Date(Math.max(...times)),
    }
}

export type GameweekDateSyncResult = {
    updated: number
    skipped: number
    total: number
}

/**
 * Copies real Premier League fixture kickoffs onto FantasyGameweek.startDate/endDate.
 * Pass a leagueId to sync one league (admin button), or omit it to sync every
 * league (automation).
 * 
 * Only touches premier_league gameweeks. Cup gameweeks get their dates from
 * syncCupGameweeks in app/api/sync/fixtures/route.ts.
 */
export async function syncGameweekDates(leagueId?: string): Promise<GameweekDateSyncResult> {
    const gameweeks = await prisma.fantasyGameweek.findMany({
        where: {
            competition: 'premier_league',
            ...(leagueId ? { fantasyLeagueId: leagueId }: {}),
        },
        select: { id: true, gameweekNumber: true, startDate: true, endDate: true },
    })

    const fixtures = await prisma.fixture.findMany({
        where: { competition: 'premier_league', gameweekNumber: { not: null } },
        select: { gameweekNumber: true, kickoff: true },
    })

    const kickoffsByGameweek = new Map<number, Date[]>()
    for (const f of fixtures) {
        const list = kickoffsByGameweek.get(f.gameweekNumber!) ?? []
        list.push(f.kickoff)
        kickoffsByGameweek.set(f.gameweekNumber!, list)
    }

    let updated = 0
    let skipped = 0

    for (const gw of gameweeks) {
        const range = computeGameweekDateRange(kickoffsByGameweek.get(gw.gameweekNumber) ?? [])
        if (!range) {
            skipped++
            continue
        }

        if (
            gw.startDate.getTime() === range.startDate.getTime() &&
            gw.endDate.getTime() === range.endDate.getTime()
        ) {
            continue
        }

        await prisma.fantasyGameweek.update({
            where: { id: gw.id },
            data: range,
        })

        updated++
    }

    return { updated, skipped, total: gameweeks.length }
}