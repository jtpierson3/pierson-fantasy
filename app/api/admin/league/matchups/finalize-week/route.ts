import { NextResponse } from 'next/server'
import { requireSiteAdmin } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import { getLeagueStandings } from '@/lib/leagueStandings'
import { computeWeeklyResults } from '@/lib/weeklyResults'

class FinalizeError extends Error {
    constructor(message: string, public status: number) {
        super(message)
    }
}

export async function POST(req: Request) {
    try {
        const authResult = await requireSiteAdmin()
        if (!authResult.ok) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status })
        }

        const { gameweekId } = await req.json()
        if (typeof gameweekId !== 'string') {
            return NextResponse.json({ error: 'gameweekId is required' }, { status: 400 })
        }

        const summary = await prisma.$transaction(async tx => {
            const gameweek = await tx.fantasyGameweek.findUnique({
                where: { id: gameweekId },
                include: { matchups: true },
            })
            if (!gameweek) throw new FinalizeError('Gameweek not found', 404)
            if (gameweek.isComplete) throw new FinalizeError('This gameweek is already finalized', 409)

            const incomplete = gameweek.matchups.filter(m => !m.isComplete).length
            if (incomplete > 0) {
                throw new FinalizeError(`${incomplete} matchup(s) are not marked complete`, 400)
            }

            const teamsBefore = await tx.fantasyTeam.findMany({
                where: { fantasyLeagueId: gameweek.fantasyLeagueId },
            })
            const beforeRank = new Map(getLeagueStandings(teamsBefore).map(s => [s.team.id, s.rank]))

            const claimed = await tx.fantasyGameweek.updateMany({
                where: { id: gameweekId, isComplete: false },
                data: { isComplete: true, isCurrent: false },
            })
            if (claimed.count === 0) throw new FinalizeError('This gameweek is already finalized', 409)

            const outcomes = computeWeeklyResults(gameweek.matchups, teamsBefore.length)
            for (const o of outcomes) {
                await tx.fantasyTeam.update({
                    where: { id: o.teamId },
                    data: {
                        wins: { increment: o.result === 'win' ? 1 : 0 },
                        losses: { increment: o.result === 'loss' ? 1 : 0 },
                        draws: { increment: o.result === 'draw' ? 1 : 0 },
                        totalLeaguePoints: { increment: o.leaguePoints },
                        totalFantasyPoints: { increment: o.score },
                    }
                })
            }

            const nextGameweek = gameweek.isCurrent
                ? await tx.fantasyGameweek.findFirst({
                    where: {
                        fantasyLeagueId: gameweek.fantasyLeagueId,
                        competition: gameweek.competition,
                        gameweekNumber: gameweek.gameweekNumber + 1,
                        isComplete: false
                    }
                })
                : null
            if (nextGameweek) {
                await tx.fantasyGameweek.update({
                    where: { id: nextGameweek.id },
                    data: { isCurrent: true },
                })
            }
            if (gameweek.isCurrent && !nextGameweek) {
                console.warn(`[finalize-week] finalized GW${gameweek.gameweekNumber} but no GW${gameweek.gameweekNumber + 1} exists - isCurrent is left unset`)
            }

            const teamsAfter = await tx.fantasyTeam.findMany({
                where: { fantasyLeagueId: gameweek.fantasyLeagueId },
            })
            for (const { team, rank } of getLeagueStandings(teamsAfter)) {
                const oldRank = beforeRank.get(team.id) ?? rank
                await tx.fantasyTeam.update({
                    where: { id: team.id },
                    data: { standingsChange: oldRank - rank },
                })
            }

            return {
                finalizedGameweek: gameweek.gameweekNumber,
                newCurrentGameweek: nextGameweek?.gameweekNumber ?? null
            }
        }, { timeout: 20000 })

        return NextResponse.json({
            success: true,
            finalizedGameweek: summary.finalizedGameweek,
            newCurrentGameweek: summary.newCurrentGameweek,
            advancedCurrent: summary.newCurrentGameweek !== null,
        })
    } catch (err) {
        if (err instanceof FinalizeError) {
            return NextResponse.json({ error: err.message }, { status: err.status })
        }
        console.error('[finalize-week] error:', err)
        return NextResponse.json({ error: 'Failed to finalize week' }, { status: 500 })
    }
}