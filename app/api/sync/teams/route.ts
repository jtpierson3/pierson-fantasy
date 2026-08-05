import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { COMPETITIONS } from '@/lib/sportmonksConstants'

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
  let relegated = 0

  try {
    const teamsData = await sportmonksFetch(`/teams/seasons/${SEASON_ID}`)
    const teams = teamsData.data ?? []

    if (teams.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No teams returned from Sportmonks for this season', seasonId: SEASON_ID },
        { status: 404 }
      )
    }

    const freshTeamIds = teams.map((t: { id: number }) => t.id)

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

    // Reconciliation - any team still marked Premier League but NOT in this
    // fresh 20-team list has been relegated. Reclassify them to Championship
    // so departure detection and eligibility checks stay accurate.
    const relegatedTeams = await prisma.team.updateMany({
      where: {
        leagueId: LEAGUE_ID,
        id: { notIn: freshTeamIds }
      },
      data: { leagueId: COMPETITIONS.championship.leagueId }
    })
    relegated = relegatedTeams.count

    return NextResponse.json({
      success: errors.length === 0,
      message: `${created} team(s) created, ${updated} team(s) updated, ${relegated} team(s) relegated`,
      totalFetched: teams.length,
      created,
      updated,
      relegated,
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