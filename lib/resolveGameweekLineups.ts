import { prisma } from '@/lib/prisma'
import { resolveAndPersistLineup } from '@/lib/gameweekLineupResolution'
import { resolveCupGameweekForAllTeams } from '@/lib/cupScoring'
import type { PipelineResult } from '@/lib/pipelineResult'

export async function resolveGameweekLineups(gameweekId: string): Promise<PipelineResult<{ teamsResolved: number }>> {
    const gameweek = await prisma.fantasyGameweek.findUnique({ where: { id: gameweekId } })
    if (!gameweek) return { ok: false, status: 404, error: 'Gameweek not found' }

    if (gameweek.competition !== 'premier_league') {
        return { ok: true, teamsResolved: await resolveCupGameweekForAllTeams(gameweekId)}
    }

    const lineups = await prisma.gameweekLineup.findMany({
        where: { gameweekId },
        select: { fantasyTeamId: true },
    })

    let resolvedCount = 0
    for (const lineup of lineups) {
        const resolved = await resolveAndPersistLineup(lineup.fantasyTeamId, gameweekId)
        if (resolved) resolvedCount++
    }

    return { ok: true, teamsResolved: resolvedCount }
}