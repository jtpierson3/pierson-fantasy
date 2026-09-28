'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_BADGE: Record<string, string> = {
    eliminated: 'bg-gray-100 text-gray-500',
    jury: 'bg-blue-100 text-blue-600',
    finalist: 'bg-purple-100 text-purple-600',
    winner: 'bg-yellow-100 text-yellow-600',
}

type ContestantRow = {
    contestantId: string
    name: string
    imageUrl: string | null
    status: string
    points: number
}

type MemberRow = {
    memberId: string
    username: string
    points: number
    contestants: ContestantRow[]
    pickName: string | null
    isCorrect: boolean
}

export default function EpisodeSummary({
    leagueId,
    episode,
    season,
    seasonEpisodes,
    members,
    pickBonusPoints,
}: {
    leagueId: string
    episode: { id: string; number: number; name: string; isFinale: boolean; isAired: boolean }
    season: { id: string, number: number; title: string }
    seasonEpisodes: { id: string; number: number; name: string }[]
    members: MemberRow[]
    pickBonusPoints: number
}) {
    const router = useRouter()

    return (
        <div className="p-4 space-y-4">
            <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-sm font-medium text-gray-900">
                            {episode.name} - Ep {episode.number}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Season {season.number}: {season.title}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/survivor/seasons/${season.id}/episodes/${episode.id}`}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            View Full Episode
                        </Link>
                    </div>
                    <select
                        value={episode.id}
                        onChange={(e) =>
                            router.push(`/dashboard/survivor/${leagueId}/episodes/${e.target.value}`)
                        }
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-gray-700"
                    >
                        {seasonEpisodes.map((e) => (
                            <option key={e.id} value={e.id}>
                                Ep {e.number} - {e.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">    
                {members.map((m) => (
                    <div
                        key={m.memberId}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-gray-100 flex items-cetner justify-between">
                            <h2 className="text-sm font-medium text-gray-900">{m.username}</h2>
                            <span className="text-sm font-medium text-green-700">{m.points} pts</span>
                        </div>

                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-3">
                                {m.contestants.map((c) => (
                                    <div key={c.contestantId} className="flex flex-col items-center gap-1">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                                            {c.imageUrl ? (
                                                <Image
                                                    src={c.imageUrl}
                                                    alt={c.name}
                                                    fill
                                                    sizes="48px"
                                                    className={`object-cover object-[center_top] ${c.status === 'eliminated' ? 'grayscale' : ''}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-lg text-gray-400">{c.name[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-900 truncate max-w-[4rem] text-center">
                                            {c.name.split(' ')[0]}
                                        </p>
                                        <span
                                            className={`text-xs px-1 rounded font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}
                                        >
                                            {c.points}pts
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {episode.isAired ? (
                                <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                                    Pick:{' '}
                                    {m.pickName ? (
                                        <span className={m.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                            {m.pickName}
                                            {m.isCorrect && (
                                                <span className="text-green-600 font-medium">+{pickBonusPoints}</span>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">No Pick</span>
                                    )}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-gray-100">Picks Hidden Until Episode Airs</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}