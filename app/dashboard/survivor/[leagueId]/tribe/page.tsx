import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import MyTribe from './MyTribe'

async function MyTribeContent({ leagueId }: { leagueId: string }) {
    const { userId } = await auth()
    if (!userId) redirect('sign-in')
    
    const user = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    if (!user) redirect('/sign-in')

    const league = await prisma.survivorLeague.findUnique({
        where: { id: leagueId },
        include: {
            survivorSeason: true,
            members: true
        }
    })

    if (!league) notFound()

    const isMember = league.members.some(m => m.userId === user.id)
    if (!isMember) notFound()

    const myTribe = await prisma.survivorFantasyLeagueTribe.findFirst({
        where: { userId: user.id, survivorLeagueId: leagueId },
        include: {
            players: {
                include: {
                    contestant: {
                        include: {
                            survivorPlayer: true,
                            tribeMemberships: {
                                where: { isCurrent: true },
                                include: { tribe: true}
                            },
                            episodeStats: {
                                include: { event: true, episode: true }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!myTribe) notFound()

    const airedEpisodeIds = new Set(
        (await prisma.episode.findMany({
            where: {
                survivorSeasonId: league.survivorSeason.id,
                isAired: true
            },
            select: { id: true }
        })).map(e => e.id)
    )

    return (
        <MyTribe 
            leagueId={leagueId}
            tribe={myTribe}
            season={league.survivorSeason}
            airedEpisodeIds={airedEpisodeIds}
        />
    )
}

export default async function MyTribePage({
    params,
}: {
    params: Promise<{ leagueId: string }>
}) {
    const { leagueId } = await params
    return (
        <Suspense fallback={
            <div className="p-6 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
            </div>
        }>
            <MyTribeContent leagueId={leagueId} />
        </Suspense>
    )
}