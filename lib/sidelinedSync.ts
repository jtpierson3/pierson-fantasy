import { prisma } from '@/lib/prisma'
import { getTeamSidelined } from '@/lib/sportmonks'
import { logApiCall } from '@/lib/apiCallBudget'

export async function syncTeamSidelined(teamId: number, triggeredBySource: string): Promise<number> {
    const { sidelined, remaining } = await getTeamSidelined(teamId)

    await logApiCall(`teams/${teamId}/sidelined`, 'SYNC_SIDELINED', {
        triggeredBy: triggeredBySource,
        remainingAfterCall: remaining,
    })

    let synced = 0

    for (const entry of sidelined) {
        const fields = {
            category: entry.category,
            typeId: entry.type_id,
            typeName: entry.type.name,
            startDate: new Date(entry.start_date),
            endDate: entry.end_date ? new Date(entry.end_date) : null,
            gamesMissed: entry.games_missed,
            completed: entry.completed,
        }

        const existingBySportmonksId = await prisma.sidelined.findUnique({
            where: { sportmonksId: entry.id },
            select: { id: true }, 
        })

        if (!existingBySportmonksId) {
            const manualRow = await prisma.sidelined.findFirst({
                where: { playerId: entry.player_id, source: 'MANUAL', completed: false },
                orderBy: { startDate: 'desc' },
                select: { id: true },
            })
            if (manualRow) {
                await prisma.sidelined.update({
                    where: { id: manualRow.id },
                    data: { ...fields, sportmonksId: entry.id, source: 'SPORTMONKS' },
                })
                synced++
                continue
            }
        }

        await prisma.sidelined.upsert({
            where: { sportmonksId: entry.id },
            update: fields,
            create: { sportmonksId: entry.id, playerId: entry.player_id, source: 'SPORTMONKS', ...fields },
        })
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