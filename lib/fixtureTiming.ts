import { prisma } from '@/lib/prisma'
import { calculateWaiverCloseTime } from './waiverWindowCalculation'
import { FantasyCompetition, FantasyGameweek } from '@prisma/client'

export type FixtureWindowInfo = {
    closesAt: Date
} | null

export async function getCurrentWaiverWindow(): Promise<FixtureWindowInfo> {
    const now = new Date()

    // Find the earliest gameweek whose first fixture hasn't started yet-
    // this correctly advances even if the previous gamemweek is still
    // marked incomplete
    const upcomingGameweek = await prisma.fantasyGameweek.findFirst({
        where: { startDate: { gt: now } },
        orderBy: { startDate: 'asc' },
        select: { startDate: true }
    })

    if (!upcomingGameweek) return null

    const closesAt = calculateWaiverCloseTime(upcomingGameweek.startDate)

    return {
        closesAt
    }
}

export async function getActiveWaiverGameweek(fantasyLeagueId: string) {
    return prisma.fantasyGameweek.findFirst({
        where: { fantasyLeagueId, startDate: { gt: new Date() }, isComplete: false },
        orderBy: { startDate: 'asc' }
    })
}

export async function isWaiverWindowClosed(): Promise<boolean> {
    const window = await getCurrentWaiverWindow()
    if (!window) return false
    return new Date() >= window.closesAt
}

const COMPETITION_TO_FIXTURE_KEY: Record<FantasyCompetition, string> = {
    premier_league: 'premier_league',
    league_cup: 'carabao_cup',
    domestic_cup: 'fa_cup',
}

export async function getCurrentGameweekByCompetition(fantasyLeagueId: string, competition: FantasyCompetition) {
    return prisma.fantasyGameweek.findFirst({
        where: { fantasyLeagueId, competition, isCurrent: true }
    })
}

/**
 * Finds the earliest upcoming Premier League fixture for a given FantasyGAmeweek's
 * date trange. used to determine when lineups lock for that gameweek - the lock 
 * time is the kickoff of the first fixture in the week. Not a rolling "next fixture"
 * like the waiver window (lineups lock per gameweek not continuously)
 */
export async function getGameweekLockTime(gameweek: FantasyGameweek ) {
    const firstFixture = await prisma.fixture.findFirst({
        where: {
            kickoff: { gte: gameweek.startDate, lte: gameweek.endDate },
            competition: COMPETITION_TO_FIXTURE_KEY[gameweek.competition],
        },
        orderBy: { kickoff: 'asc' }
    })
    return firstFixture?.kickoff ?? null
}

export async function isGameweekLocked(gameweek: FantasyGameweek): Promise<boolean> {
    const lockTime = await getGameweekLockTime(gameweek)
    if(!lockTime) return false 
    return new Date() >= lockTime
}