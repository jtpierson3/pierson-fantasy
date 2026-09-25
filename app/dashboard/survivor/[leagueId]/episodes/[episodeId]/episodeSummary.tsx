'use client'

import { useRouter } from 'next/navigation'

type MemberRow = {
    memberId: string
    username: string
    points: number
    pickName: string | null
    isCorrect: boolean
}

export default function EpisodeSummary({
    leagueId,
    episode,
    season,
    seasonEpisodes,
    members,
}: {
    leagueId: string
    episode: { id: string; number: number; name: string; isFinale: boolean }
    season: { number: number; title: string }
    seasonEpisodes: { id: string; number: number; name: string }[]
    members: MemberRow[]
}) {
    const router = useRouter()

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-sm font-medium text-gray-900">
                            {episode.name} - Ep {episode.number}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Season {season.number}: {season.title}
                        </p>
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

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                {members.map((m, i) => (
                    <div
                        key={m.memberId}
                        className={`p-4 flex items-center justify-between ${
                            i < members.length -1 ? 'border-b border-gray-100' : ''
                        }`}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-900">{m.username}</p>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Pick:{' '}
                                {m.pickName ? (
                                    <span className={m.isCorrect ? 'text-green-600 font-medium' : 'text-gray-900'}>
                                        {m.pickName}
                                    </span>
                                ): (
                                    <span className="text-gray-400">No pick</span>
                                )}
                            </p>
                        </div>
                        <span className="text-sm font-medium text-green-700">{m.points} pts</span>
                    </div>
                ))}
            </div>
        </div>
    )
}