import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COMPETITIONS, type CompetitionKey } from '@/lib/sportmonksConstants'
import { getLeagueById } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'
import { requireAutomationSecret } from '@/lib/automationAuth'

export async function POST(req: Request) {
  const authResult = requireAutomationSecret(req)
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const results: { key: string; success: boolean; name?: string; error?: string }[] = []

  for (const key of Object.keys(COMPETITIONS) as CompetitionKey[]) {
    const { leagueId, seasonId } = COMPETITIONS[key]

    try {
      const { league, remaining } = await getLeagueById(leagueId)

      await logApiCall(`leagues/${leagueId}`, 'SYNC_LEAGUE', {
        triggeredBy: 'sync-admin-panel',
        remainingAfterCall: remaining
      })

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