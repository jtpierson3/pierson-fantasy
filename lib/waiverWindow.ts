import { prisma } from '@/lib/prisma'

export type WaiverWindowInfo = {
    closesAt: Date
    triggeringFixture: {
        id: number
        competition: string
        homeTeamName: string
        awayTeamName: string
        kickoff: Date
    }
} | null

const LOCK_HOURS_BEFORE_KICKOFF = 2

/*
 * Finds the next upcoming fixture chronolgocially across all synced competitions
 * and returns when the waiver window closes relative to it (2 hours before kickoff) 
 * returns null if there are no upcoming fixtures at all
 */
export async function getCurrentWaiverWindow(): Promise<WaiverWindowInfo> {
    const now = new Date()

    const nextFixture = await prisma.fixture.findFirst({
        where: {
            kickoff: { gt: now },
            homeTeamId: { not: null },
            awayTeamId: { not: null },
        },
        orderBy: { kickoff: 'asc' }
    })

    if (!nextFixture) return null

    const closesAt = new Date(nextFixture.kickoff)
    closesAt.setHours(closesAt.getHours() - LOCK_HOURS_BEFORE_KICKOFF)

    return {
        closesAt,
        triggeringFixture: {
            id: nextFixture.id,
            competition: nextFixture.competition,
            homeTeamName: nextFixture.homeTeamName,
            awayTeamName: nextFixture.awayTeamName,
            kickoff: nextFixture.kickoff,
        }
    }
}

/*
 * Returns true if the waiver window is currently closed (past the lock threshold) 
 * for the upcoming fixture. If there's no upcoming fixture at all, treat as open
 * (nothing to lock against)
 */
export async function isWaiverWindowClosed(): Promise<boolean> {
    const window = await getCurrentWaiverWindow()
    if (!window) return false
    return new Date() >= window.closesAt
}