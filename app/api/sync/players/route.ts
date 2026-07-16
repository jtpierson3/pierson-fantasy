import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
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

  const errors: { team: string; message: string }[] = []
  const teamResults: { team: string; created: number; updated: number; skipped: number }[] = []
  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0

  try {
    const teams = await prisma.team.findMany()

    if (teams.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No teams found in database — run team sync first' },
        { status: 400 }
      )
    }

    for (const team of teams) {
      let teamCreated = 0
      let teamUpdated = 0
      let teamSkipped = 0

      try {
        const squadData = await sportmonksFetch(
          `/squads/seasons/${SEASON_ID}/teams/${team.id}?include=player`
        )
        const squad = squadData.data ?? []

        for (const member of squad) {
          const player = member.player
          if (!player) {
            teamSkipped++
            continue
          }

          const existing = await prisma.player.findUnique({ where: { id: player.id } })

          await prisma.player.upsert({
            where: { id: player.id },
            update: {
              display_name: player.display_name,
              image_path: player.image_path,
              position_id: member.position_id ?? player.position_id ?? 0,
              detailed_position_id: member.detailed_position_id ?? player.detailed_position_id ?? null,
              jersey_number: member.jersey_number ?? null,
              date_of_birth: player.date_of_birth ?? null,
              teamId: team.id,
            },
            create: {
              id: player.id,
              display_name: player.display_name,
              image_path: player.image_path,
              position_id: member.position_id ?? 0,
              detailed_position_id: member.detailed_position_id ?? null,
              jersey_number: member.jersey_number ?? null,
              date_of_birth: player.date_of_birth ?? null,
              teamId: team.id,
            },
          })

          if (existing) teamUpdated++
          else teamCreated++
        }

        teamResults.push({ team: team.name, created: teamCreated, updated: teamUpdated, skipped: teamSkipped })
        totalCreated += teamCreated
        totalUpdated += teamUpdated
        totalSkipped += teamSkipped
      } catch (err) {
        errors.push({
          team: team.name,
          message: err instanceof Error ? err.message : 'Unknown error syncing squad',
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${totalCreated} player(s) created, ${totalUpdated} updated across ${teams.length} team(s)`,
      teamsProcessed: teams.length,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      teamResults,
      errors,
    })
  } catch (err) {
    console.error('[sync/players] error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Players sync failed',
        created: totalCreated,
        updated: totalUpdated,
        errors,
      },
      { status: 500 }
    )
  }
}