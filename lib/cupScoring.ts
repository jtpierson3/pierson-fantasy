import { prisma } from "./prisma";

export async function resolveCupGameweekPoints(fantasyTeamId: string, gameweekId: string) {
    const gameweek = await prisma.fantasyGameweek.findUnique({ 
        where: { id: gameweekId } 
    })
    if (!gameweek) return 0

    const snapshot = await prisma.gameweekLineup.findUnique({
        where: { fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId } },
        include: { players: true }
    })
    if (!snapshot) return 0

    const allPlayerIds = snapshot.players.map(p => p.playerId)

    const pointsRows = await prisma.playerFixturePoints.findMany({
        where: { playerId: { in: allPlayerIds }, fixture: { gameweekNumber: gameweek.gameweekNumber } }
    })

    const total = pointsRows.reduce((sum, row) => sum + row.points, 0)

    await prisma.gameweekLineup.update({
        where: { id: snapshot.id },
        data: { cupPointsTotal: total }
    })

    return total
}

export async function resolveCupGameweekForAllTeams(gameweekId: string): Promise<number> {
    const lineups = await prisma.gameweekLineup.findMany({
        where: { gameweekId }, select: { fantasyTeamId: true }
    })
    for (const lineup of lineups) {
        await resolveCupGameweekPoints(lineup.fantasyTeamId, gameweekId)
    }
    return lineups.length
}