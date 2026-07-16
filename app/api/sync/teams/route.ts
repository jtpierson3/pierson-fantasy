import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const LEAGUE_ID = 8
const SEASON_ID = 28083

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

  const errors: { teamId: number | string; name?: string; message: string }[] = []
  let created = 0
  let updated = 0

  try {
    const teamsData = await sportmonksFetch(`/teams/seasons/${SEASON_ID}`)
    const teams = teamsData.data ?? []

    if (teams.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No teams returned from Sportmonks for this season', seasonId: SEASON_ID },
        { status: 404 }
      )
    }

    for (const team of teams) {
      try {
        const existing = await prisma.team.findUnique({ where: { id: team.id } })

        await prisma.team.upsert({
          where: { id: team.id },
          update: {
            name: team.name,
            short_code: team.short_code ?? null,
            image_path: team.image_path,
            leagueId: LEAGUE_ID,
          },
          create: {
            id: team.id,
            name: team.name,
            short_code: team.short_code ?? null,
            image_path: team.image_path,
            leagueId: LEAGUE_ID,
          },
        })

        if (existing) updated++
        else created++
      } catch (err) {
        errors.push({
          teamId: team.id,
          name: team.name,
          message: err instanceof Error ? err.message : 'Unknown error upserting team',
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${created} team(s) created, ${updated} team(s) updated`,
      totalFetched: teams.length,
      created,
      updated,
      errors,
    })
  } catch (err) {
    console.error('[sync/teams] error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Teams sync failed',
        seasonId: SEASON_ID,
        created,
        updated,
        errors,
      },
      { status: 500 }
    )
  }
}