import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FantasyCompetition } from '@prisma/client'
import { env } from '@/lib/env'
import { getUpcomingFixturesBySeason } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'
import { COMPETITIONS, DOMESTIC_CUP_ROUND_TO_GAMEWEEK, LEAGUE_CUP_ROUND_TO_GAMEWEEK, mapFixtureStatus, type CompetitionKey } from '@/lib/sportmonksConstants'

async function syncCupGameweeks(competition: FantasyCompetition, gameweekNumbers: Set<number>) {
  const leagues = await prisma.fantasyLeague.findMany({ select: { id: true } })

  for (const gameweekNumber of gameweekNumbers) {
    const roundFixtures = await prisma.fixture.findMany({
      where: { competition, gameweekNumber },
      select: { kickoff: true }
    })
    if (roundFixtures.length === 0) continue

    const kickoffs = roundFixtures.map(f => f.kickoff.getTime())
    const startDate = new Date(Math.min(...kickoffs))
    const endDate = new Date(Math.max(...kickoffs))

    for (const league of leagues) {
      await prisma.fantasyGameweek.upsert({
        where: { fantasyLeagueId_gameweekNumber: { fantasyLeagueId: league.id, gameweekNumber } },
        update: { startDate, endDate }, // keeps dates fresh
        create: { fantasyLeagueId: league.id, gameweekNumber, startDate, endDate, competition },
      })
    }
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors: { competition: string; message: string }[] = []
  let totalCreated = 0
  let totalUpdated = 0
  const competitionResults: { competition: string; created: number; updated: number; fetched: number }[] = []

  try {
    for (const key of Object.keys(COMPETITIONS) as CompetitionKey[]) {
      const { leagueId, seasonId } = COMPETITIONS[key]
      let created = 0
      let updated = 0
      const competitionGameweekNumbers = new Set<number>()

      try {
        const { fixtures, remaining } = await getUpcomingFixturesBySeason(seasonId, COMPETITIONS[key].seasonEndDate)

        await logApiCall(`fixtures/between (${key})`, 'SYNC_FIXTURES', {
          triggeredBy: 'sync/fixtures',
          remainingAfterCall: remaining
        })

        for (const fx of fixtures) {
          const participants = fx.participants ?? []
          const home = participants.find(p => p.meta?.location === 'home')
          const away = participants.find(p => p.meta?.location === 'away')

          if (!home || !away) continue

          const homeTeamExists = await prisma.team.findUnique({ where: { id: home.id } })
          const awayTeamExists = await prisma.team.findUnique({ where: { id: away.id } })

          const homeScoreEntry = fx.scores?.find(
            s => s.score.participant === 'home' && s.description === 'CURRENT'
          )
          const awayScoreEntry = fx.scores?.find(
            s => s.score.participant === 'away' && s.description === 'CURRENT'
          )

          const existing = await prisma.fixture.findUnique({ where: { id: fx.id } })

          const roundOrStageName = fx.round?.name ?? fx.stage?.name ?? null

          let gameweekNumber: number | null = null
          let competition: FantasyCompetition = 'premier_league'

          if (key === 'premier_league' && fx.round?.name) {
            gameweekNumber = parseInt(fx.round.name) || null
          } else if (key === 'carabao_cup' && fx.stage?.name) {
            gameweekNumber = LEAGUE_CUP_ROUND_TO_GAMEWEEK[fx.stage.name] ?? null
            competition = 'league_cup'
          } else if (key === 'fa_cup' && fx.stage?.name) {
            gameweekNumber = DOMESTIC_CUP_ROUND_TO_GAMEWEEK[fx.stage.name] ?? null
            competition = 'domestic_cup'
          }

          if (gameweekNumber !== null && (key === 'carabao_cup' || key === 'fa_cup')) {
            competitionGameweekNumbers.add(gameweekNumber)
          }

          const data = {
            leagueId,
            seasonId: COMPETITIONS[key].seasonId,
            round: roundOrStageName,
            gameweekNumber,
            homeTeamId: homeTeamExists ? home.id : null,
            awayTeamId: awayTeamExists ? away.id : null,
            homeTeamName: home.name,
            awayTeamName: away.name,
            homeTeamImage: home.image_path ?? null,
            awayTeamImage: away.image_path ?? null,
            homeScore: homeScoreEntry?.score.goals ?? null,
            awayScore: awayScoreEntry?.score.goals ?? null,
            status: mapFixtureStatus(fx.state_id),
            kickoff: new Date(fx.starting_at),
            venue: fx.venue?.name ?? null,
            competition: key,
          }

          await prisma.fixture.upsert({
            where: { id: fx.id },
            update: data,
            create: { id: fx.id, ...data },
          })

          if (existing) updated++
          else created++
        }

        if (key === 'carabao_cup' || key === 'fa_cup') {
          await syncCupGameweeks(key === 'carabao_cup' ? 'league_cup' : 'domestic_cup', competitionGameweekNumbers)
        }

        competitionResults.push({ competition: key, created, updated, fetched: fixtures.length })
        totalCreated += created
        totalUpdated += updated
      } catch (err) {
        errors.push({
          competition: key,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${totalCreated} fixture(s) created, ${totalUpdated} updated across ${Object.keys(COMPETITIONS).length} competitions`,
      competitionResults,
      errors,
    })
  } catch (err) {
    console.error('[sync/fixtures] error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Fixtures sync failed',
        created: totalCreated,
        updated: totalUpdated,
        errors,
      },
      { status: 500 }
    )
  }
}