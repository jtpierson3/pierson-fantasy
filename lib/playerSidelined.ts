import { prisma } from '@/lib/prisma'

export type SidelinedCategory = 'injury' | 'suspended'

export type ActiveSidelinedInfo = {
    category: string
    typeName: string
    endDate: Date | null
    gamesMissed: number
}

export async function getActiveSidelinedForPlayers(
    playerIds: number[]
): Promise<Map<number, ActiveSidelinedInfo>> {
    const rows = await prisma.sidelined.findMany({
        where: { playerId: { in: playerIds }, completed: false },
        select: { playerId: true, category: true, typeName: true, endDate: true, gamesMissed: true }
    })

    const map = new Map<number, ActiveSidelinedInfo>()
    for (const row of rows) {
        // if a player somehow has multiple active entires, keep the first one found
        if (!map.has(row.playerId)) {
            map.set(row.playerId, {
                category: row.category,
                typeName: row.typeName,
                endDate: row.endDate,
                gamesMissed: row.gamesMissed,
            })
        }
    }
    return map
}