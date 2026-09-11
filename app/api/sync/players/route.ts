import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COMPETITIONS } from '@/lib/sportmonksConstants'
import { getSquad, getTransfersBetween } from '@/lib/sportmonks'
import { detectDepartures, getTeamsEligibleForDepartureCheck } from '@/lib/playerDeparture'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { logApiCall } from '@/lib/apiCallBudget'
import { recordDeparture } from '@/lib/playerTransferRecording'
import { resolveLatestTransferPerPlayer } from '@/lib/playerTransferResolution'

const SEASON_ID = COMPETITIONS.premier_league.seasonId

export async function POST(req: Request) {
  const authResult = requireAutomationSecret(req)
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  // Optional - let's a scheduled trigger identify itself distinctly from a manual admin-panel click,
  // so downstream checks (like the pre-gameweek sync dedup) can tell which run produced a given log entry
  let triggeredBySource = 'sync-admin-panel'
  try {
    const body = await req.json()
    if (body?.triggeredBySource) {
      triggeredBySource = body.triggeredBySource
    }
  } catch {
    // no body provided (e.g. a manual trigger), that's fine, use the default value.
  }


  const errors: { team: string; message: string }[] = []
  const teamResults: { team: string; created: number; updated: number; skipped: number, }[] = []
  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0
  let totalDeparted = 0

  try {
    // Only real clubs in leagues I pay for counts as "tracked"
    const teams = await prisma.team.findMany({
      where: { leagueId: COMPETITIONS.premier_league.leagueId}
    })

    if (teams.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No teams found in database — run team sync first' },
        { status: 400 }
      )
    }

    const currentlyTrackedTeamIds = teams.map(t => t.id)

    const previouslyTrackedTeamIds = (
      await prisma.player.findMany({
        where: { teamId: { in: currentlyTrackedTeamIds } },
        select: { teamId: true },
        distinct: ['teamId']
      })
    ).map(p => p.teamId).filter((id): id is number => id !== null)

    const eligibleForDepartureCheck = new Set(
      getTeamsEligibleForDepartureCheck(previouslyTrackedTeamIds, currentlyTrackedTeamIds)
    )

    for (const team of teams) {
      let teamCreated = 0
      let teamUpdated = 0
      let teamSkipped = 0

      try {
        // Capture this team's squad BEFORE the fresh sync overwrites anything
        const previousSquad = eligibleForDepartureCheck.has(team.id)
          ? await prisma.player.findMany({
            where: { teamId: team.id },
            select: { id: true }
          })
          : []

        const { squad, remaining } = await getSquad(SEASON_ID, team.id)

        await logApiCall(`squads/seasons/${SEASON_ID}/teams/${team.id}`, 'SYNC_PLAYERS', {
          triggeredBy: triggeredBySource,
          remainingAfterCall: remaining
        })

        const currentSquadPlayerIds: number[] = []

        for (const member of squad) {
          const player = member.player
          if (!player) {
            teamSkipped++
            continue
          }

          currentSquadPlayerIds.push(player.id)

          const existing = await prisma.player.findUnique({ where: { id: player.id } })

          await prisma.player.upsert({
            where: { id: player.id },
            update: {
              display_name: player.display_name,
              image_path: player.image_path,
              position_id: member.position_id ?? 0,
              detailed_position_id: member.detailed_position_id ?? null,
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

        // Departure detection - only for teams we're safely comparing this run
        if (eligibleForDepartureCheck.has(team.id)) {
          const departedIds = detectDepartures(
            previousSquad.map(p => ({ playerId: p.id })),
            currentSquadPlayerIds.map(id => ({ playerId: id }))
          )

          for (const playerId of departedIds) {
            await recordDeparture(playerId)
            totalDeparted++
          }
        }

        totalCreated += teamCreated
        totalUpdated += teamUpdated
        totalSkipped += teamSkipped
      } catch (err) {
        errors.push({
          team: team.name,
          message: err instanceof Error ? err.message : 'Unknown error syncing squad',
        })
      }

      teamResults.push({
        team: team.name,
        created: teamCreated,
        updated: teamUpdated,
        skipped: teamSkipped,
      })
    }

    // Reconciliation pass: the squad-by-season endpoint can list a player under two tracked teams at once
    // mid-transfer (no way to tell which is current from squad data alone), and never reliably drops a 
    // departed player from their old team's squad. The transfers feed is ground truth for both cases,
    // so it runs a corrective pass after the squad loop.
    const LOOKBACK_DAYS = 21
    const today = new Date()
    const lookbackStart = new Date(today.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    const toDateString = (d: Date) => d.toISOString().slice(0, 10)

    let transfersReconciled = 0
    let departuresRecorded = 0

    try {
      const { transfers, remaining } = await getTransfersBetween(
        toDateString(lookbackStart),
        toDateString(today)
      )

      await logApiCall(`transfers/between/${toDateString(lookbackStart)}/${toDateString(today)}`, 'PLAYER_TRANSFER_LOOKUP', {
        triggeredBy: triggeredBySource,
        remainingAfterCall: remaining
      })

      const trackedTeamIdsSet = new Set(currentlyTrackedTeamIds)
      const latestTransfers = resolveLatestTransferPerPlayer(transfers, trackedTeamIdsSet)

      for (const [playerId, transfer] of latestTransfers) {
        const player = await prisma.player.findUnique({ where: { id: playerId } })
        if (!player) continue

        if (transfer.to_team_id !== null && trackedTeamIdsSet.has(transfer.to_team_id)) {
          if (player.teamId !== transfer.to_team_id) {
            await prisma.player.update({
              where: { id: playerId },
              data: { teamId: transfer.to_team_id },
            })
            transfersReconciled++
          }
        } else {
          await recordDeparture(playerId)
          departuresRecorded++
        }
      }
    } catch (err) {
      errors.push({
        team: 'transfer-reconciliation',
        message: err instanceof Error ? err.message : 'Unknown error reconciling transfers',
      })
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${totalCreated} player(s) created, ${totalUpdated} updated, ${totalDeparted} departure(s) flagged for review, ${transfersReconciled} transfer(s) reconciled, across ${teams.length} team(s)`,
      teamsProcessed: teams.length,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      departed: totalDeparted,
      transfersReconciled,
      departuresRecorded,
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