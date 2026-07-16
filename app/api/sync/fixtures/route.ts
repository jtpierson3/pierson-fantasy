import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'

const COMPETITIONS: { key: string; leagueId: number; seasonId: number }[] = [
  { key: 'premier_league', leagueId: 8, seasonId: 25583 },
  { key: 'fa_cup', leagueId: 24, seasonId: 25583 }, // TODO: confirm actual FA Cup season_id
  { key: 'carabao_cup', leagueId: 27, seasonId: 25583 }, // TODO: confirm actual Carabao Cup season_id
]

async function sportmonksFetch(endpoint: string) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sportmonks error: ${res.status} - ${text}`)
  }
  return res.json()
}

function mapStatus(stateId: number): string {
  // Sportmonks fixture state IDs — common ones
  // 1 = Not Started, 2-6ish = live variants, 5 = Finished, others = postponed/cancelled
  if (stateId === 1) return 'scheduled'
  if (stateId === 5) return 'finished'
  if ([2, 3, 4, 6, 7, 8].includes(stateId)) return 'live'
  return 'other'
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
    for (const comp of COMPETITIONS) {
      let created = 0
      let updated = 0

      try {
        const fixturesData = await sportmonksFetch(
          `/fixtures?filters=fixtureLeagues:${comp.leagueId}&include=participants;venue;round`
        )
        const fixtures = fixturesData.data ?? []

        for (const fx of fixtures) {
          const participants = fx.participants ?? []
          const home = participants.find((p: { meta?: { location?: string } }) => p.meta?.location === 'home')
          const away = participants.find((p: { meta?: { location?: string } }) => p.meta?.location === 'away')

          if (!home || !away) continue

          // Check if these teams exist in our Team table (Premier League teams will, others may not)
          const homeTeamExists = await prisma.team.findUnique({ where: { id: home.id } })
          const awayTeamExists = await prisma.team.findUnique({ where: { id: away.id } })

          const existing = await prisma.fixture.findUnique({ where: { id: fx.id } })

          await prisma.fixture.upsert({
            where: { id: fx.id },
            update: {
              leagueId: comp.leagueId,
              seasonId: comp.seasonId,
              round: fx.round?.name ?? null,
              gameweekNumber: comp.key === 'premier_league' ? (fx.round?.name ? parseInt(fx.round.name) || null : null) : null,
              homeTeamId: homeTeamExists ? home.id : null,
              awayTeamId: awayTeamExists ? away.id : null,
              homeTeamName: home.name,
              awayTeamName: away.name,
              homeTeamImage: home.image_path ?? null,
              awayTeamImage: away.image_path ?? null,
              homeScore: home.meta?.score ?? null,
              awayScore: away.meta?.score ?? null,
              status: mapStatus(fx.state_id),
              kickoff: new Date(fx.starting_at),
              venue: fx.venue?.name ?? null,
              competition: comp.key,
            },
            create: {
              id: fx.id,
              leagueId: comp.leagueId,
              seasonId: comp.seasonId,
              round: fx.round?.name ?? null,
              gameweekNumber: comp.key === 'premier_league' ? (fx.round?.name ? parseInt(fx.round.name) || null : null) : null,
              homeTeamId: homeTeamExists ? home.id : null,
              awayTeamId: awayTeamExists ? away.id : null,
              homeTeamName: home.name,
              awayTeamName: away.name,
              homeTeamImage: home.image_path ?? null,
              awayTeamImage: away.image_path ?? null,
              homeScore: home.meta?.score ?? null,
              awayScore: away.meta?.score ?? null,
              status: mapStatus(fx.state_id),
              kickoff: new Date(fx.starting_at),
              venue: fx.venue?.name ?? null,
              competition: comp.key,
            }
          })

          if (existing) updated++
          else created++
        }

        competitionResults.push({ competition: comp.key, created, updated, fetched: fixtures.length })
        totalCreated += created
        totalUpdated += updated
      } catch (err) {
        errors.push({
          competition: comp.key,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${totalCreated} fixture(s) created, ${totalUpdated} updated across ${COMPETITIONS.length} competitions`,
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