import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getFixturesBySeason } from '@/lib/sportmonks'
import { COMPETITIONS, mapFixtureStatus, type CompetitionKey } from '@/lib/sportmonksConstants'

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
      const { leagueId } = COMPETITIONS[key]
      let created = 0
      let updated = 0

      try {
        const fixtures = await getFixturesBySeason(leagueId)

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

          const gameweekNumber =
            key === 'premier_league' && fx.round?.name
              ? parseInt(fx.round.name) || null
              : null

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