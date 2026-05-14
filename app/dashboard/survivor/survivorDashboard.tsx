'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

type SurvivorPlayer = {
    id: string
    name: string
}

type Contestant = {
    id: string
    status: string
    imageUrl: string | null
    survivorPlayer: SurvivorPlayer
}

type SurvivorPick = {
    id: string
    contestant: Contestant
}

type Tribe = { 
    id: string
    name: string
    userId: string
    players: SurvivorPick[]
}

type Season = {
    id: string
    number: number
    title: string
    imageUrl: string | null
    isActive: boolean
}

type League = {
    id: string
    name: string
    survivorSeason: Season
    members: { id: string; user: { id: string; username: string } }[]
    tribes: Tribe[]
}

type Props = {
    leagues: League[]
    userId: string
}

const STATUS_STYLES: Record<string, string> = {
    active: 'ring-2 ring-green-400',
    eliminated: 'opacity-50 grayscale',
    jury: 'ring-2 ring-blue-400',
    finalist: 'ring-2 ring-purple-400',
    winner: 'ring-2 ring-yellow-400'
}

export default function SurvivorDashboard({ leagues, userId }: Props) {
    const router = useRouter()

    const activeLeagues = leagues.filter(l => l.survivorSeason.isActive)
    const pastLeagues = leagues.filter(l => !l.survivorSeason.isActive)

    if (leagues.length === 0) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-medium text-gray-900 mb-2">Survivor</h1>
                <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                    <p className="text-sm text-gray-400">
                        You have not been added to any Survivor Leagues yet.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h1 className="text-xl font-medium text-gray-900 mb-6">Survivor</h1>

            {/* Active Leagues */}
            {activeLeagues.length > 0 && (
                <div className="mb-8">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Active Seasons
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {activeLeagues.map(league => (
                            <LeagueCard 
                                key={league.id}
                                league={league}
                                userId={userId}
                                onClick={() => router.push(`/dashboard/survivor/${league.id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Past Leagues */}
            {pastLeagues.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Past Seasons
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {pastLeagues.map(league => (
                            <LeagueCard 
                                key={league.id}
                                league={league}
                                userId={userId}
                                onClick={() => router.push(`/dashboard/survivor/${league.id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function LeagueCard({
    league,
    userId,
    onClick,
}: {
    league: League
    userId: string
    onClick: () => void
}) {
    const myTribe = league.tribes.find(t => t.userId === userId)
    const hasPicks = (myTribe?.players.length ?? 0) > 0

    return (
        <button
            onClick={onClick}
            className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all text-left w-full"
        >
            {/* Season Image */}
            <div className="relative h-28">
                {league.survivorSeason.imageUrl ? (
                    <Image 
                        src={league.survivorSeason.imageUrl}
                        alt={league.survivorSeason.title}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="h-full bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center">
                        <p className="text-white/40 text-3xl font-bold">
                            S{league.survivorSeason.number}
                        </p>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                <div className="absolute bottom-2 left-3">
                    <p className="text-white text-xs font-medium">
                        Season {league.survivorSeason.number}
                    </p>
                    <p className="text-white/70 text-xs">{league.survivorSeason.title}</p>
                </div>
                {league.survivorSeason.isActive && (
                    <div className="absolute top-2 right-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/90 text-white font-medium">
                            Live
                        </span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                    {league.name}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                    {league.members.length} players
                    {myTribe && ` - ${myTribe.name}`}
                </p>

                {/* Contestant Avatars or pick CTA */}
                {hasPicks ? (
                    <div className="flex -space-x-2">
                        {myTribe!.players.slice(0, 6).map(pick => (
                            <div
                                key={pick.id}
                                className={`relative w-8 h-8 rounded-full border-2 border-white overflow-hidden flex-shrink-0 ${
                                    STATUS_STYLES[pick.contestant.status] ?? ''
                                }`}
                            >
                                {pick.contestant.imageUrl ? (
                                    <Image 
                                        src={pick.contestant.imageUrl}
                                        alt={pick.contestant.survivorPlayer.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-xs text-gray-500">
                                            {pick.contestant.survivorPlayer.name[0]}
                                        </span>
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-green-700">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="text-xs font-medium">Pick your tribe</span>
                    </div>
                )}
            </div>
        </button>
    )
}