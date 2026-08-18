import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COMPETITIONS } from '@/lib/sportmonksConstants'
import { getSquad } from '@/lib/sportmonks'
import { detectDepartures, getTeamsEligibleForDepartureCheck } from '@/lib/playerDeparture'
import { requireAutomationSecret } from '@/lib/automationAuth'
import { logApiCall } from '@/lib/apiCallBudget'
import { recordDeparture } from '@/lib/playerTransferRecording'
import { getTeamSidelined } from '@/lib/sportmonks'

const SEASON_ID = COMPETITIONS.premier_league.seasonId

export async function POST(req: Request) {
  const authResult = requireAutomationSecret(req)
  if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const errors: { team: string; message: string }[] = []
  const teamResults: { team: string; created: number; updated: number; skipped: number }[] = []
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
          triggeredBy: 'sync-admin-panel',
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

      let teamSidelinedSynced = 0
      try {
        const {sidelined, remaining: sidelinedRemaining } = await getTeamSidelined(team.id)

        await logApiCall(`teams/${team.id}/sidelined`, 'SYNC_PLAYERS', {
          triggeredBy: 'sync-admin-panel',
          remainingAfterCall: sidelinedRemaining,
        })

        for (const entry of sidelined) {
          await prisma.sidelined.upsert({
            where: { sportmonksId: entry.id },
            update: {
              category: entry.category,
              typeId: entry.type_id,
              typeName: entry.type.name,
              startDate: new Date(entry.start_date),
              endDate: entry.end_date ? new Date(entry.end_date) : null,
              gamesMissed: entry.games_missed,
              completed: entry.completed,
            },
            create: {
              sportmonksId: entry.id,
              playerId: entry.player_id,
              category: entry.category,
              typeId: entry.type_id,
              typeName: entry.type.name,
              startDate: new Date(entry.start_date),
              endDate: entry.end_date ? new Date(entry.end_date) : null,
              gamesMissed: entry.games_missed,
              completed: entry.completed,
            }
          })
          teamSidelinedSynced++ 
        }

        // Cleanup any Sidelined roow for this team's players that's still marked incomplete
        // but ISN't in the fresh sidelined list anymore that has resolved
        // (player recovered/suspension served) - mark it completed
        const currentSidelinedIds = sidelined.map(s => s.id)
        await prisma.sidelined.updateMany({
          where: {
            completed: false,
            player: { teamId: team.id },
            sportmonksId: { notIn: currentSidelinedIds }
          },
          data: { completed: true }
        })
      } catch (err) {
        console.error(`[sync/players] failed to sync sidelined for ${team.id}:`, err)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `${totalCreated} player(s) created, ${totalUpdated} updated, ${totalDeparted} departure(s) flagged for review across ${teams.length} team(s)`,
      teamsProcessed: teams.length,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      departed: totalDeparted,
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