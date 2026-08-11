import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { COMPETITIONS, type CompetitionKey } from '@/lib/sportmonksConstants'
import { getLeagueById } from '@/lib/sportmonks'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { key: string; success: boolean; name?: string; error?: string }[] = []

  for (const key of Object.keys(COMPETITIONS) as CompetitionKey[]) {
    const { leagueId, seasonId } = COMPETITIONS[key]

    try {
      const league = await getLeagueById(leagueId)

      if (!league) {
        results.push({ key, success: false, error: 'No league data returned from Sportmonks'})
        continue
      }

      await prisma.league.upsert({
        where: { id: leagueId },
        update: {
          name: league.name,
          short_code: league.short_code ?? null,
          image_path: league.image_path,
          season_id: seasonId
        },
        create: {
          id: leagueId,
          name: league.name,
          short_code: league.short_code ?? null,
          image_path: league.image_path,
          season_id: seasonId
        }
      })

      results.push({ key, success: true, name: league.name })
    } catch (err) {
      results.push({
        key,
        success: false,
        error: err instanceof Error ? err.message: 'League Sync failed'
      })
    }
  }

  const anyFailed = results.some(r => !r.success)

  return NextResponse.json({
    success: !anyFailed,
    message: `Synced ${results.filter(r => r.success).length} of ${results.length} leagues`,
    results
  })
}