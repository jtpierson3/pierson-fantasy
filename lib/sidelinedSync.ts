import { prisma } from '@/lib/prisma'
import { getTeamSidelined } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'
import { planSidelinedEntries } from '@/lib/sidelinedSyncPlan'

export async function syncTeamSidelined(teamId: number, triggeredBySource: string): Promise<number> {
    const { sidelined, remaining } = await getTeamSidelined(teamId)

    await logApiCall(`teams/${teamId}/sidelined`, 'SYNC_SIDELINED', {
        triggeredBy: triggeredBySource,
        remainingAfterCall: remaining,
    })

    const entryPlayerIds = [...new Set(sidelined.map(s => s.player_id))]
    const entryIds = sidelined.map(s => s.id)

    const [knownPlayers, existingRows, openManualRows] = await Promise.all([
        prisma.player.findMany({ where: { id: { in: entryPlayerIds } }, select: { id: true } }),
        prisma.sidelined.findMany({ where: { sportmonksId: { in: entryIds } }, select: { sportmonksId: true } }),
        prisma.sidelined.findMany({
            where: { playerId: { in: entryPlayerIds }, source: 'MANUAL', completed: false },
            orderBy: { startDate: 'desc' },
            select: { id: true, playerId: true }
        }),
    ])

    const knownPlayerIds = new Set(knownPlayers.map(p => p.id))
    const existingSportmonksIds = new Set(
        existingRows.map(r => r.sportmonksId).filter((id): id is number => id !== null)
    )

    const plans = planSidelinedEntries(sidelined, knownPlayerIds, existingSportmonksIds, openManualRows)

    let synced = 0

    for (let i = 0; i < sidelined.length; i++) {
        const entry = sidelined[i]
        const plan = plans[i]

        if (plan.action === 'skip-unknown-player') {
            console.warn(`[sidelined sync] skipping entry ${entry.id} - unknown player ${entry.player_id}, need to run player sync first.`)
            continue
        }

        const fields = {
            category: entry.category,
            typeId: entry.type_id,
            typeName: entry.type.name,
            startDate: new Date(entry.start_date),
            endDate: entry.end_date ? new Date(entry.end_date) : null,
            gamesMissed: entry.games_missed,
            completed: entry.completed,
        }

        if (plan.action === 'claim-manual') {
            await prisma.sidelined.update({
                where: { id: plan.manualRowId },
                data: { ...fields, sportmonksId: entry.id, source: 'SPORTMONKS' },
            })
        } else {
            await prisma.sidelined.upsert({
                where: { sportmonksId: entry.id },
                update: fields,
                create: { sportmonksId: entry.id, playerId: entry.player_id, source: 'SPORTMONKS', ...fields },
            })
        }
        synced++
    }

    const currentSidelinedIds = sidelined.map(s => s.id)
    await prisma.sidelined.updateMany({
        where: {
            completed: false,
            source: 'SPORTMONKS',
            player: { teamId },
            sportmonksId: { notIn: currentSidelinedIds },
        },
        data: { completed: true }
    })

    return synced
}