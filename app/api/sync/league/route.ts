import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const LEAGUE_ID = 8
const SEASON_ID = 25583

async function sportmonksFetch(endpoint: string) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${endpoint}${separator}api_token=${env.SPORTMONKS_API_KEY}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sportmonks error: ${res.status} - ${text}`)
  }
  return res.json()
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const leagueData = await sportmonksFetch(`/leagues/${LEAGUE_ID}?include=currentSeason`)
    const league = leagueData.data

    if (!league) {
      return NextResponse.json(
        { error: 'No league data returned from Sportmonks', leagueId: LEAGUE_ID },
        { status: 404 }
      )
    }

    await prisma.league.upsert({
      where: { id: LEAGUE_ID },
      update: {
        name: league.name,
        short_code: league.short_code ?? null,
        image_path: league.image_path,
        season_id: SEASON_ID
      },
      create: {
        id: LEAGUE_ID,
        name: league.name,
        short_code: league.short_code ?? null,
        image_path: league.image_path,
        season_id: SEASON_ID
      }
    })

    return NextResponse.json({
      success: true,
      message: `League "${league.name}" synced successfully`,
      league: {
        id: league.id,
        name: league.name,
        seasonId: SEASON_ID,
      }
    })
  } catch (err) {
    console.error('[sync/league] error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'League sync failed',
        leagueId: LEAGUE_ID,
        seasonId: SEASON_ID,
      },
      { status: 500 }
    )
  }
}