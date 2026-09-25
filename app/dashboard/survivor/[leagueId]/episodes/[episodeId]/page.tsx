import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateTribeEpisodePoints } from '@/lib/survivorEpisodeScoring'
import EpisodeSummary from './episodeSummary'

export default async function EpisodeSummaryPage({
    params,
}: {
    params: Promise<{ leagueId: string; episodeId: string }>
}) {
    const {leagueId, episodeId } = await params

    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) redirect('/sign-in')

    const league = await prisma.survivorLeague.findUnique({
        where: { id: leagueId },
        include: {
            survivorSeason: {
                include: { episodes: { orderBy: { number: 'asc' } } },
            },
            members: { include: { user: true } },
            tribes: {
                include: {
                    user: true,
                    players: {
                        include: {
                            contestant: {
                                include: { episodeStats: { include: { event: true, episode: true } } },
                            },
                            swappedFrom: {
                                include: { episodeStats: { include: { event: true, episode: true } } },
                            },
                        },
                    },
                },
            },
            eliminationPicks: {
                where: { episodeId },
                include: { contestant: { include: { survivorPlayer: true } } },
            }
        },
    })

    if (!league) notFound()

    const isMember = league.members.some((m) => m.user.id === user.id)
    if (!isMember) notFound()

    const episode = league.survivorSeason.episodes.find((e) => e.id === episodeId)
    if (!episode) notFound()

    const mergeEpisode = league.survivorSeason.episodes.find((e) => e.isMerge)
    const mergeEpisodeNumber = mergeEpisode?.number ?? Infinity

    const members = league.members.map((member) => {
        const tribe = league.tribes.find((t) => t.userId === member.userId)
        const points = tribe
            ? calculateTribeEpisodePoints(tribe, episode.id, episode.number, mergeEpisodeNumber)
            : 0

        const pick = league.eliminationPicks.find((p) => p.userId === member.userId)

        return {
            memberId: member.id,
            username: member.user.username,
            points,
            pickName: pick?.contestant.survivorPlayer.name ?? null,
            isCorrect: pick?.isCorrect ?? false,
        }
    })

    return (
        <EpisodeSummary 
            leagueId={leagueId}
            episode={{
                id: episode.id,
                number: episode.number,
                name: episode.name,
                isFinale: episode.isFinale,
            }}
            season={{ number: league.survivorSeason.number, title: league.survivorSeason.title }}
            seasonEpisodes={league.survivorSeason.episodes.map((e) => ({
                id: e.id,
                number: e.number,
                name: e.name,
            }))}
            members={members}
        />
    )
}