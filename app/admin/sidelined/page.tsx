import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { COMPETITIONS } from '@/lib/sportmonksConstants'
import SidelinedManager from './SidelinedManager'

export default async function AdminSidelinedPage() {
    const { userId } = await auth()
    if (!userId) notFound()

    const currentUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { leagues: true },
    })
    if (!currentUser) notFound()

    const isLeagueAdmin = currentUser.leagues.some(m => m.isAdmin)
    if (!currentUser.isSiteAdmin && !isLeagueAdmin) notFound()

    const plLeagueId = COMPETITIONS.premier_league.leagueId

    const teams = await prisma.team.findMany({
        where: { leagueId: plLeagueId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    })
    const teamIds = teams.map(t => t.id)

    const players = await prisma.player.findMany({
        where: { teamId: { in: teamIds } },
        orderBy: { display_name: 'asc' },
        select: { id: true, display_name: true, teamId: true },
    })

    const active = await prisma.sidelined.findMany({
        where: { completed: false, player: { teamId: { in: teamIds } } },
        include: { player: { select: { display_name: true, teamId: true, image_path: true } } },
        orderBy: { startDate: 'desc' },
    })

    const teamNameById = new Map(teams.map(t => [t.id, t.name]))

    return (
        <SidelinedManager 
            players={players.map(p => ({
                id: p.id,
                name: p.display_name,
                teamName: p.teamId ? teamNameById.get(p.teamId) ?? null : null,
            }))}
            entries={active.map(s => ({
                id: s.id,
                source: s.source,
                playerId: s.playerId,
                playerName: s.player.display_name,
                playerImage: s.player.image_path,
                teamName: s.player.teamId ? teamNameById.get(s.player.teamId) ?? null : null,
                category: s.category,
                typeName: s.typeName,
                startDate: s.startDate.toISOString(),
                endDate: s.endDate?.toISOString() ?? null,
            }))}
        />
    )
}