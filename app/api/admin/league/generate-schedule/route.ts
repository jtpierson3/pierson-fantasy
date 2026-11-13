import { NextResponse } from 'next/server'
import { requireLeagueAdminOf } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'
import { PREMIER_LEAGUE_GAMEWEEKS } from '@/lib/leagueRules'

function generateRoundRobinRounds(teamIds: string[]): { home: string; away: string}[][] {
    const teams = [...teamIds]
    const hasBye = teams.length % 2 !== 0
    if (hasBye) teams.push('BYE')

    const n = teams.length
    const rounds: { home: string; away: string }[][] = []

    //Circle method: fix first team, rotate the rest
    const rotating = teams.slice(1)

    for (let round = 0; round < n - 1; round++) {
        const roundMatches: { home: string; away: string }[] = []
        const current = [teams[0], ...rotating]

        for (let i = 0; i < n / 2; i++) {
            const home = current[i]
            const away = current[n- 1 - i]
            if (home !== 'BYE' && away !== 'BYE') {
                // Alternate home and away across rounds for fairness
                if (round % 2 === 0) {
                    roundMatches.push({ home, away })
                } else {
                    roundMatches.push({ home: away, away: home })
                }
            }
        }
        
        rounds.push(roundMatches)
        // Rotate: move last element of rotating to front
        rotating.unshift(rotating.pop()!)
    }

    return rounds
}

export async function POST(req: Request) {
    try {
        const { leagueId } = await req.json()

        const authResult = await requireLeagueAdminOf(leagueId)
        if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

        const league = await prisma.fantasyLeague.findUnique({
            where: { id: leagueId },
            include: { teams: true }
        })
        if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

        if (league.scheduleGenerated) {
            return NextResponse.json({ error: 'Schedule has already been generated for this league.' }, { status: 400 })
        }

        const teamIds = league.teams.map(t => t.id)
        if (teamIds.length < 2) {
            return NextResponse.json({ error: 'Need at least 2 teams to generate a schedule' }, { status: 400 })
        }

        const rounds = generateRoundRobinRounds(teamIds)
        const weeksPerCycle = rounds.length

        const startDate = new Date()

        const generated = await prisma.$transaction(async tx => {
            const claimed = await tx.fantasyLeague.updateMany({
                where: { id: leagueId, scheduleGenerated: false },
                data: { scheduleGenerated: true },
            })
            if (claimed.count === 0) return false

            for (let week = 1; week <= PREMIER_LEAGUE_GAMEWEEKS; week++) {
                const roundMatches = rounds[(week - 1) % weeksPerCycle]

                //TODO: THIS HAS TO BE ADJESTED TO WORK WITH THE FIXTURE SCHEDULE OF THE LEAGUE
                const weekStart = new Date(startDate)
                weekStart.setDate(weekStart.getDate() + (week - 1) * 7)
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekEnd.getDate() + 6)

                const gameweek = await tx.fantasyGameweek.create({
                    data: {
                        fantasyLeagueId: leagueId,
                        gameweekNumber: week,
                        startDate: weekStart,
                        endDate: weekEnd,
                        isCurrent: week === 1,
                    },
                })

                await tx.fantasyMatchup.createMany({
                    data: roundMatches.map(m => ({
                        gameweekId: gameweek.id,
                        homeTeamId: m.home,
                        awayTeamId: m.away,
                    })),
                })
            }
            return true
        }, { timeout: 30000 })

        if (!generated) {
            return NextResponse.json({ error: 'Schedule has already been generated for this league.' }, { status: 400 })
        }

        return NextResponse.json({ success: true, weeksGenerated: PREMIER_LEAGUE_GAMEWEEKS })
    } catch (err) {
        console.error('[generate-schedule] error: ', err)
        return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
    }
}