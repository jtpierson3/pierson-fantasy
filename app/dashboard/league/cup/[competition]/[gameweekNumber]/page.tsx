import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPlayerPointsForGameweek } from '@/lib/playerPoints'
import {
    LEAGUE_CUP_GAMEWEEK_TO_ROUND,
    DOMESTIC_CUP_GAMEWEEK_TO_ROUND,
} from '@/lib/sportmonksConstants'
import CupRosterGrid, { type CupRosterPlayer } from './CupRosterGrid'

const CUP_META = {
    league_cup: { label: 'Carabao Cup', rounds: LEAGUE_CUP_GAMEWEEK_TO_ROUND },
    domestic_cup: { label: 'FA Cup', rounds: DOMESTIC_CUP_GAMEWEEK_TO_ROUND },
} as const

type CupKey = keyof typeof CUP_META

function CupMatchupSkeleton() {
    return (
        <div className="p-6">
            <div className="h-16 bg-gray-100 rounded-xl animate-pulse mb-4" />
            <div className="h-[600px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
    )
}

async function CupMatchupContent({ competition, gameweekNumber }: { competition: CupKey; gameweekNumber: number }) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const team = await prisma.fantasyTeam.findFirst({
        where: { userId: user.id },
        select: { id: true, name: true, formation: true, fantasyLeagueId: true },
    })
    if (!team) notFound()

    const gameweek = await prisma.fantasyGameweek.findUnique({
        where: {
            fantasyLeagueId_gameweekNumber: {
                fantasyLeagueId: team.fantasyLeagueId, 
                gameweekNumber,
            },
        },
        select: { id: true, gameweekNumber: true, competition: true }
    })
    if (!gameweek || gameweek.competition !== competition) notFound()

    const meta = CUP_META[competition]
    const roundName = meta.rounds[gameweek.gameweekNumber] ?? `Gameweek ${gameweekNumber}`

    const snapshot = await prisma.gameweekLineup.findUnique({
        where: {
            fantasyTeamId_gameweekId: {
                fantasyTeamId: team.id,
                gameweekId: gameweek.id,
            },
        },
        include: {
            players: {
                include: {
                    player: { include: { team: true } },
                },
            },
        },
    })

    let sourcePlayers: { playerId: number; player: any }[]
    if (snapshot && snapshot.players.length > 0) {
        sourcePlayers = snapshot.players.map(p => ({ playerId: p.playerId, player: p.player }))
    } else {
        const roster = await prisma.fantasyTeamPlayer.findMany({
            where: { fantasyTeamId: team.id, rosterSlot: { not: 'IR' } },
            include: { player: { include: { team: true } } },
        })
        sourcePlayers = roster.map(r => ({ playerId: r.playerId, player: r.player }))
    }

    const pointsMap = await getPlayerPointsForGameweek(
        sourcePlayers.map(p => p.playerId),
        gameweek.gameweekNumber
    )

    const players: CupRosterPlayer[] = sourcePlayers
        .map(({ playerId, player }) => {
            const gw = pointsMap.get(playerId)
            return {
                id: String(playerId),
                points: gw?.points ?? 0,
                breakdown: gw?.breakdown ?? [],
                player: {
                    id: player.id,
                    display_name: player.display_name,
                    image_path: player.image_path,
                    position_id: player.position_id,
                    detailed_position_id: player.detailed_position_id,
                    team: player.team
                        ? {
                            name: player.team.name,
                            image_path: player.team.image_path,
                            leagueId: player.team.leagueId,
                          }
                        : null,
                },
            }
        })
        .sort((a, b) => b.points - a.points || a.player.display_name.localeCompare(b.player.display_name))

        const liveTotal = players.reduce((sum, p) => sum + p.points, 0)
        const roundTotal = snapshot?.cupPointsTotal ?? liveTotal

        return (
            <div className="p-6">
                <CupRosterGrid 
                    competitionLabel={meta.label}
                    roundName={roundName}
                    teamName={team.name}
                    roundTotal={roundTotal}
                    resolved={snapshot?.cupPointsTotal != null}
                    players={players}
                />
            </div>
        )
}

export default async function CupMatchupPage({
    params,
} : {
    params: Promise<{ competition: string; gameweekNumber: string }>
}) {
    const { competition, gameweekNumber } = await params
    const gwNum = Number(gameweekNumber)
    if (!(competition in CUP_META) || !Number.isInteger(gwNum)) notFound()

    return (
        <Suspense fallback={<CupMatchupSkeleton />}>
            <CupMatchupContent competition={competition as CupKey} gameweekNumber={gwNum} />
        </Suspense>
    )
}