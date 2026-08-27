import { prisma } from '@/lib/prisma'
import { calculateWaiverCloseTime } from './waiverWindowCalculation'
import { FantasyCompetition, FantasyGameweek } from '@prisma/client'

export type FixtureWindowInfo = {
    closesAt: Date
} | null

export type WaiverClaimInput = {
    id: string
    fantasyTeamId: string
    playerToAddId: number
    playerToDropId: number | null
    rank: number
}

export type WaiverTeamInput = {
    id: string
    waiverPriority: number
    rosterPlayerIds: number[] // non-IR rostered Playerids
    rosterSize: number        // non-IR roster count (used for the 23 cap)
}

export type WaiverClaimResult = {
    claimId: string
    status: 'won' | 'lost' | 'invalidated'
}

export type WaiverProcessingResult = {
    claimResults: WaiverClaimResult[]
    finalTeamState: Record<string, {
        rosterPlayerIds: number[]
        waiverPriority: number
    }>
}

const MAX_NON_IR_ROSTER = 23

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

/**
 * Pure function - resolves a batch of pending waiver claims for one league.
 * Take plain in-memory data, returns plain in-memory results.
 * No I/O - callers are responsible for loading input and persisting output.
 */
export function resolveWaiverClaims(
    claims: WaiverClaimInput[],
    teams: WaiverTeamInput[]
): WaiverProcessingResult {
    const claimStatusMap = new Map<string, 'won' | 'lost' | 'invalidated'>()

    const teamRosterMap = new Map<string, Set<number>>()
    const teamRosterSizeMap = new Map<string, number>()
    const teamPriorityMap = new Map<string, number>()

    for (const team of teams) {
        teamRosterMap.set(team.id, new Set(team.rosterPlayerIds))
        teamRosterSizeMap.set(team.id, team.rosterSize)
        teamPriorityMap.set(team.id, team.waiverPriority)
    }

    const claimedPlayerIds = new Set<number>()

    const teamIdsWithClaims = new Set(claims.map(c => c.fantasyTeamId))
    let activeTeamIds = Array.from(teamIdsWithClaims)

    const maxPriority = teams.length > 0 ? Math.max(...teams.map(t => t.waiverPriority)) : 0
    let nextBackOfLinePriority = maxPriority + 1

    while (activeTeamIds.length > 0) {
        const sortedTeamIds = [...activeTeamIds].sort(
            (a, b) => teamPriorityMap.get(a)! - teamPriorityMap.get(b)!
        )

        let anySuccessThisPass = false
        const teamsToRemove: string[] = []

        for (const teamId of sortedTeamIds) {
            const teamClaims = claims
                .filter(c => c.fantasyTeamId === teamId && !claimStatusMap.has(c.id))
                .sort((a, b) => a.rank - b.rank)

            if (teamClaims.length === 0) {
                teamsToRemove.push(teamId)
                continue
            }

            let processedOne = false

            for (const claim of teamClaims) {
                const roster = teamRosterMap.get(teamId)!
                const rosterSize = teamRosterSizeMap.get(teamId)!

                const playerAlreadyTaken = claimedPlayerIds.has(claim.playerToAddId)
                const dropStillValid = claim.playerToDropId
                    ? roster.has(claim.playerToDropId)
                    : true
                const hasOpenSlot = claim.playerToDropId
                    ? true
                    : rosterSize < MAX_NON_IR_ROSTER

                const isValid = !playerAlreadyTaken && dropStillValid && hasOpenSlot

                if (isValid) {
                    claimedPlayerIds.add(claim.playerToAddId)
                    roster.add(claim.playerToAddId)

                    if (claim.playerToDropId) {
                        roster.delete(claim.playerToDropId) //roster size unchanged, one out one in
                    } else {
                        teamRosterSizeMap.set(teamId, rosterSize + 1)
                    }

                    claimStatusMap.set(claim.id, 'won')

                    // Invalidate every OTHER pending claim on the same playerToAdd
                    for (const other of claims) {
                        if (other.id === claim.id || claimStatusMap.has(other.id)) continue
                        if (other.playerToAddId === claim.playerToAddId) {
                            claimStatusMap.set(other.id, 'lost')
                        }
                    }

                    // If a player was dropped, invalidate this team's other claims involving that player
                    if (claim.playerToDropId) {
                        for (const other of claims) {
                            if (other.id === claim.id || claimStatusMap.has(other.id)) continue
                            if (
                                other.fantasyTeamId === teamId && 
                                (other.playerToAddId === claim.playerToDropId || other.playerToDropId === claim.playerToDropId)
                            ) {
                                claimStatusMap.set(other.id, 'invalidated')
                            }
                        }
                    }

                    teamPriorityMap.set(teamId, nextBackOfLinePriority)
                    nextBackOfLinePriority++

                    processedOne = true
                    anySuccessThisPass = true
                    break
                }
            }

            if (!processedOne) {
                for (const claim of teamClaims) {
                    claimStatusMap.set(claim.id, 'lost')
                }
                teamsToRemove.push(teamId)
            }
        }

        activeTeamIds = activeTeamIds.filter(id => !teamsToRemove.includes(id))

        if (!anySuccessThisPass) break
    }

    const claimResults: WaiverClaimResult[] = Array.from(claimStatusMap.entries()).map(
        ([claimId, status]) => ({ claimId, status })
    )

    const finalTeamState: WaiverProcessingResult['finalTeamState'] = {}
    for (const team of teams) {
        finalTeamState[team.id] = {
            rosterPlayerIds: Array.from(teamRosterMap.get(team.id) ?? []),
            waiverPriority: teamPriorityMap.get(team.id) ?? team.waiverPriority,
        }
    }

    return { claimResults, finalTeamState}
}