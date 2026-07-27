import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import MatchupPitch from '@/app/components/matchup/MatchupPitch'
import type { MatchupTeamData, MatchupPlayer } from '@/app/components/matchup/MatchupPitch'
import { getLeagueStandings } from '@/lib/leagueStandings'

function MatchupSkeleton() {
    return (
        <div className="p-6">
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse mb-4" />
            <div className="h-[900px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
    )
}

async function buildTeamData(fantasyTeamId: string, gameweekId: string, fantasyLeagueId: string): Promise<MatchupTeamData> {
    const team = await prisma.fantasyTeam.findUnique({
        where: { id: fantasyTeamId }
    })

    const leagueTeams = await prisma.fantasyTeam.findMany({
        where: { fantasyLeagueId },
        select: { id: true, totalLeaguePoints: true, totalFantasyPoints: true }
    })

    const standings = getLeagueStandings(leagueTeams)
    const rank = standings.find(s => s.team.id === fantasyTeamId)?.rank ?? null

    const snapshot = await prisma.gameweekLineup.findUnique({
        where: {
            fantasyTeamId_gameweekId: {
                fantasyTeamId,
                gameweekId
            }
        },
        include: {
            players: {
                include: {
                    player: { include: { team: true } }
                }
            }
        }
    })

    const players: MatchupPlayer[] = (snapshot?.players ?? []).map(p => ({
        id: p.id,
        playerId: p.playerId,
        rosterSlot: p.rosterSlot,
        slotOrder: p.slotOrder,
        points: 0, // Placeholder until scoring exists
        player: {
            id: p.player.id,
            display_name: p.player.display_name,
            image_path: p.player.image_path,
            position_id: p.player.position_id,
            detailed_position_id: p.player.detailed_position_id,
            team: p.player.team
                ? { name: p.player.team.name, image_path: p.player.team.image_path }
                : null,
        }
    }))

    return {
        name: team?.name ?? 'Unknown Team',
        formation: snapshot?.formation ?? team?.formation ?? 'Not set',
        totalPoints: 0, // Placeholder until scoring exists
        players,
        rank,
        totalTeams: leagueTeams.length,
        leagueRecord: {
            wins: team?.wins ?? 0,
            losses: team?.losses ?? 0,
            draws: team?.draws ?? 0,
            leaguePoints: team?.totalLeaguePoints ?? 0
        }
    }
}

async function MatchupContent({ matchupId }: { matchupId: string }) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const matchup = await prisma.fantasyMatchup.findUnique({
        where: { id: matchupId },
        include: { gameweek: true }
    })

    if (!matchup) notFound()

    // Confirm the viewer is in the same league as this matchup
    const isMember = await prisma.fantasyLeagueMember.findFirst({
        where: {
            userId: user.id,
            fantasyLeagueId: matchup.gameweek.fantasyLeagueId,
        }
    })
    if (!isMember) notFound()

    const [homeTeam, awayTeam] = await Promise.all([
        buildTeamData(matchup.homeTeamId, matchup.gameweekId, matchup.gameweek.fantasyLeagueId),
        buildTeamData(matchup.awayTeamId, matchup.gameweekId, matchup.gameweek.fantasyLeagueId)
    ])

    return (
        <div className="p-6">
            <p className="text-sm text-gray-400 mb-4">
                Gameweek {matchup.gameweek.gameweekNumber}
            </p>
            <MatchupPitch homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>
    )
}

export default async function MatchupPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return (
        <Suspense fallback={<MatchupSkeleton />}>
            <MatchupContent matchupId={id} />
        </Suspense>
    )
}