import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

const TOTAL_WEEKS = 38

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
            return NextResponse.json({ error: 'Unauthorized'}, { status: 401 })
        }

        const league = await prisma.fantasyLeague.findUnique({
            where: { id: leagueId },
            include: { teams: true }
        })
        if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

        if (league.scheduleGenerated) {
            return NextResponse.json({ error: 'Schedule has already been generated for this league.' }, { status: 400 })
        }

        const teamIds = league.teams.map(t => t.id)
        if (teamIds.length < 2) {{
            return NextResponse.json({ error: 'Need at least 2 teams to generate a schedule', status: 400 })
        }}

        const rounds = generateRoundRobinRounds(teamIds)
        const weeksPerCycle = rounds.length

        // Build gameweeks + matchups, repeating the cyle to fill TOTAL_WEEKS
        const startDate = new Date()

        for (let week = 1; week <= TOTAL_WEEKS; week++) {
            const roundIndex = (week - 1) % weeksPerCycle
            const roundMatches = rounds[roundIndex]

            // TODO: THIS HAS TO BE ADJUSTED TO WORK WITH THE FIXTURE SCHEDULE OF THE LEAGUE
            const weekStart = new Date(startDate)
            weekStart.setDate(weekStart.getDate() + (week - 1) * 7)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)

            const gameweek = await prisma.fantasyGameweek.create({
                data: {
                    fantasyLeagueId: leagueId,
                    gameweekNumber: week,
                    startDate: weekStart,
                    endDate: weekEnd,
                    isCurrent: week === 1,
                }
            })

            await prisma.fantasyMatchup.createMany({
                data: roundMatches.map(m => ({
                    gameweekId: gameweek.id,
                    homeTeamId: m.home,
                    awayTeamId: m.away,
                }))
            })
        }

        await prisma.fantasyLeague.update({
            where: { id: leagueId },
            data: { scheduleGenerated: true }
        })

        return NextResponse.json({ success: true, weeksGenerated: TOTAL_WEEKS })
    } catch (err) {
        console.error('[generate-schedule] error: ', err)
        return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 })
    }
}