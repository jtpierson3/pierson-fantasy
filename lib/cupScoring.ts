import { prisma } from "./prisma";

export async function resolveCupGameweekPoints(fantasyTeamId: string, gameweekId: string) {
    const gameweek = await prisma.fantasyGameweek.findUnique({ 
        where: { id: gameweekId } 
    })
    if (!gameweek || gameweek.competition === 'premier_league') return 0

    const team = await prisma.fantasyTeam.findUnique({
        where: { id: fantasyTeamId },
        select: { formation: true },
    })
    if (!team) return 0

    const roster = await prisma.fantasyTeamPlayer.findMany({
        where: { fantasyTeamId, rosterSlot: { not: 'IR' } },
        orderBy: { slotOrder: 'asc' },
    })

    const pointsRows = await prisma.playerFixturePoints.findMany({
        where: {
            playerId: { in: roster.map(r => r.playerId) },
            fixture: { gameweekNumber: gameweek.gameweekNumber },
        },
    })
    const total = pointsRows.reduce((sum, row) => sum + row.points, 0)

    const playerRows = roster.map((r, i) => ({
        playerId: r.playerId,
        rosterSlot: r.rosterSlot,
        slotOrder: i,
    }))

    const existing = await prisma.gameweekLineup.findUnique({
        where: { fantasyTeamId_gameweekId: { fantasyTeamId, gameweekId } },
        select: { id: true },
    })

    if (existing) {
        await prisma.gameweekLineup.deleteMany({ where: { id: existing.id } })
        await prisma.gameweekLineup.update({
            where: { id: existing.id },
            data: {
                formation: team.formation,
                lockedAt: new Date(),
                cupPointsTotal: total,
                players: { create: playerRows },
            },
        })
    } else {
        await prisma.gameweekLineup.create({
            data: {
                fantasyTeamId,
                gameweekId,
                formation: team.formation,
                cupPointsTotal: total,
                players: { create: playerRows }
            }
        })
    }

    return total
}

export async function resolveCupGameweekForAllTeams(gameweekId: string): Promise<number> {
    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: { id: gameweekId },
        select: { fantasyLeagueId: true },
    })
    if (!gameweek) return 0

    const teams = await prisma.fantasyTeam.findMany({
        where: { fantasyLeagueId: gameweek.fantasyLeagueId },
        select: { id: true },
    })
    for (const team of teams) {
        await resolveCupGameweekPoints(team.id, gameweekId)
    }

    return teams.length
}