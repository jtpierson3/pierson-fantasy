import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth()
        if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const currentUser = await prisma.user.findUnique({ where: { clerkId } })
        if (!currentUser?.isSiteAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { gameweekId } = await req.json()

        const gameweek = await prisma.fantasyGameweek.findUnique({
            where: { id: gameweekId },
            include: {
                matchups: {
                    include: {
                        homeTeam: true,
                        awayTeam: true,
                    }
                },
                fantasyLeague: {
                    include: {
                        teams: true,
                    }
                }
            }
        })

        if (!gameweek) return NextResponse.json({ error: 'Gameweek not found' }, { status: 404 })

        // Capture current standings order (before this week's update) for standingsChange
        const beforeStandings = [...gameweek.fantasyLeague.teams]
            .sort((a, b) => {
                if (b.totalLeaguePoints !== a.totalLeaguePoints) return b.totalLeaguePoints - a.totalLeaguePoints
                return b.totalFantasyPoints - a.totalFantasyPoints
            })
        const beforeRank = new Map(beforeStandings.map((t, i) => [t.id, i + 1]))

        // Build weekly score list - every team's score this week
        const weeklyScores: { teamId: string; score: number }[] = []
        gameweek.matchups.forEach(m => {
            weeklyScores.push({ teamId: m.homeTeamId, score: m.homePoints })
            weeklyScores.push({ teamId: m.awayTeamId, score: m.awayPoints })
        })

        
        const totalTeamCount = gameweek.fantasyLeague.teams.length
        const cutoffBase = Math.floor(totalTeamCount / 2)

        const sortedScores = [...weeklyScores].sort((a, b) => b.score - a.score)
        let cutoffCount = cutoffBase
        if (sortedScores.length > cutoffBase) {
            const lastInCutoffScore = sortedScores[cutoffBase- 1 ].score
            const nextScore = sortedScores[cutoffBase].score
            if (nextScore === lastInCutoffScore) {
                cutoffCount = cutoffBase + 1 
            }
        }
        const topScoreThreshold = sortedScores[Math.min(cutoffCount, sortedScores.length) - 1]?.score ?? -Infinity
        const topTeamIds = new Set(
            sortedScores.filter(s => s.score >= topScoreThreshold).map(s => s.teamId)
        )

        //Process each matchup - determine result + update each team
        for (const matchup of gameweek.matchups) {
            const homeWon = matchup.homePoints > matchup.awayPoints
            const awayWon = matchup.awayPoints > matchup.homePoints

            // Determine result for home team
            let homeResult: 'win' | 'loss' | 'draw'
            if (homeWon) homeResult = 'win'
            else if (!awayWon) homeResult = 'draw' // exact tie in the matchup itself
            else homeResult = topTeamIds.has(matchup.homeTeamId) ? 'draw' : 'loss'

            //Determine result for away team
            let awayResult: 'win' | 'loss' | 'draw'
            if (awayWon) awayResult = 'win'
            else if (!homeWon) awayResult = 'draw'
            else awayResult = topTeamIds.has(matchup.awayTeamId) ? 'draw': 'loss'

            await updateTeamResult(matchup.homeTeamId, homeResult, matchup.homePoints)
            await updateTeamResult(matchup.awayTeamId, awayResult, matchup.awayPoints)
        }

        async function updateTeamResult(
            teamId: string,
            result: 'win' | 'loss' | 'draw',
            weekScore: number
        ) {
            const leaguePointsToAdd = result === 'win' ? 3 : result === 'draw' ? 1 : 0

            await prisma.fantasyTeam.update({
                where: { id: teamId },
                data: {
                    wins: { increment: result === 'win' ? 1 : 0 },
                    losses: { increment: result === 'loss' ? 1 : 0 },
                    draws: { increment: result === 'draw' ? 1 : 0 },
                    totalLeaguePoints: { increment: leaguePointsToAdd },
                    totalFantasyPoints: { increment: weekScore }
                }
            })
        }

        const wasCurrent = gameweek.isCurrent

        const nextGameweek = wasCurrent
            ? await prisma.fantasyGameweek.findFirst({
                where: {
                    fantasyLeagueId: gameweek.fantasyLeagueId,
                    competition: gameweek.competition,
                    gameweekNumber: gameweek.gameweekNumber + 1,
                    isComplete: false,
                },
            })
            : null

        await prisma.$transaction([
            prisma.fantasyGameweek.update({
                where: { id: gameweekId },
                data: {
                    isComplete: true, 
                    ...(wasCurrent ? { isCurrent : false }: {}),
                },
            }),
            ...(nextGameweek
                ?   [
                        prisma.fantasyGameweek.update({
                            where: { id: nextGameweek.id },
                            data: { isCurrent: true },
                        }),
                    ]
                : []),
        ])

        if (wasCurrent && !nextGameweek) {
            console.warn(`[finalize-week] finalized GW${gameweek.gameweekNumber} but no GW${gameweek.gameweekNumber + 1} exists - isCurrent is left unset`)
        }

        // Recalculate standings order AFTER updates to compute standings change
        const afterTeams = await prisma.fantasyTeam.findMany({
            where: { fantasyLeagueId: gameweek.fantasyLeagueId }
        })
        const afterStandings = [...afterTeams].sort((a, b) => {
            if (b.totalLeaguePoints !== a.totalLeaguePoints) return b.totalLeaguePoints - a.totalLeaguePoints
            return b.totalFantasyPoints - a.totalFantasyPoints
        })

        for (let i = 0; i < afterStandings.length; i++) {
            const team = afterStandings[i]
            const newRank = i + 1
            const oldRank = beforeRank.get(team.id) ?? newRank
            const change = oldRank - newRank // positive = moved up

            await prisma.fantasyTeam.update({
                where: { id: team.id },
                data: { standingsChange: change }
            })
        }

        return NextResponse.json({
            success: true,
            finalizedGameweek: gameweek.gameweekNumber,
            newCurrentGameweek: nextGameweek?.gameweekNumber ?? null,
            advancedCurrent: Boolean(nextGameweek),
        })
    } catch (err) {
        console.error('[finalize-week] error:', err)
        return NextResponse.json({ error: 'Failed to finalize week' }, { status: 500 })
    }
}