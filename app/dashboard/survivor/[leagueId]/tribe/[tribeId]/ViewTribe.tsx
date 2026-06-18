'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { Wire_One } from 'next/font/google'

type TribeWithPlayers = Prisma.SurvivorFantasyLeagueTribeGetPayload<{
  include: {
    user: true
    players: {
      include: {
        contestant: {
          include: {
            survivorPlayer: true
            tribeMemberships: {
              where: { isCurrent: true }
              include: { tribe: true }
            }
            episodeStats: {
              include: { event: true; episode: true }
            }
          }
        }
        swappedFrom: {
            include: {
                survivorPlayer: true
                tribeMemberships: {
                    include: {
                        tribe: true
                    }
                }
                episodeStats: {
                    include: { event: true; episode: true}
                }
            }
        }
      }
    }
  }
}>

type Season = {
  id: string
  number: number
  title: string
}

type EliminationPick = Prisma.EliminationPickGetPayload<{
  include: {
    contestant: { include: { survivorPlayer: true } }
    episode: true
  }
}>

type Episode = {
  id: string
  number: number
  name: string
  isAired: boolean
  isFinale: boolean
}

type MergeEpisode = {
    id: string
    number: number
} | null

type Props = {
  leagueId: string
  tribe: TribeWithPlayers
  season: Season
  airedEpisodeIds: Set<string>
  isMyTribe: boolean
  mergeEpisode: MergeEpisode
  eliminationPicks: EliminationPick[]
  eliminationPickPoints: number
  winnerPickPoints: number
  episodes: Episode[]
}

const STATUS_STYLES: Record<string, string> = {
  active: 'border-green-400',
  eliminated: 'border-red-400',
  jury: 'border-blue-300',
  finalist: 'border-purple-300',
  winner: 'border-yellow-400',
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  eliminated: { label: 'Eliminated', color: 'bg-gray-100 text-gray-500' },
  jury: { label: 'Jury', color: 'bg-blue-100 text-blue-600' },
  finalist: { label: 'Finalist', color: 'bg-purple-100 text-purple-600' },
  winner: { label: 'Winner', color: 'bg-yellow-100 text-yellow-600' },
}

export default function ViewTribe({
  leagueId,
  tribe,
  season,
  airedEpisodeIds,
  isMyTribe,
  mergeEpisode,
  eliminationPicks,
  eliminationPickPoints,
  winnerPickPoints,
  episodes
}: Props) {
  const router = useRouter()

  const hasPicks = tribe.players.length > 0

  const totalPoints = tribe.players.reduce((total, pick) => {
    return total + pick.contestant.episodeStats
      .filter(s => airedEpisodeIds.has(s.episode.id))
      .reduce((sum, s) => sum + s.event.points, 0)
  }, 0)

  return (
    <div className="p-6 mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/survivor" className="hover:text-gray-600 transition-colors">
          Survivor
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/survivor/${leagueId}`}
          className="hover:text-gray-600 transition-colors"
        >
          League
        </Link>
        <span>/</span>
        <span className="text-gray-900">{tribe.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-medium text-gray-900">{tribe.name}</h1>
        {isMyTribe && (
          <button
            onClick={() => router.push(`/dashboard/survivor/${leagueId}/tribe`)}
            className="text-xs text-green-700 hover:text-green-800 font-medium transition-colors"
          >
            Manage my tribe →
          </button>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-6">
        {tribe.user.username} · Season {season.number} · {season.title}
        {hasPicks && ` · ${totalPoints} pts`}
      </p>

      <div className="flex gap-6">
        {/* Left 1/3 - episode table */}
        <div className="w-1/3 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <div>Episode</div>
              <div className="text-right">Points</div>
            </div>

            {/* Episode Rows */}
            <div className="divide-y divide-gray-50">
              {episodes.map(episode => {
                const isAired = airedEpisodeIds.has(episode.id)
                const pick = eliminationPicks.find(p => p.episodeId === episode.id)

                const episodePoints = (tribe.players ?? []).reduce((total, p) => {
                  const mergeEpisodeNumber = mergeEpisode?.number ?? 0
                  if (p.isSwap) {
                    if (episode.number > mergeEpisodeNumber) {
                      return total + p.contestant.episodeStats
                        .filter(s => s.episode.id === episode.id)
                        .reduce((sum, s) => sum + s.event.points, 0)
                    }
                    return total + (p.swappedFrom?.episodeStats ?? [])
                      .filter(s => s.episode.id === episode.id)
                      .reduce((sum, s) => sum + s.event.points, 0)
                  }
                  return total + p.contestant.episodeStats
                    .filter(s => s.episode.id === episode.id)
                    .reduce((sum, s) => sum + s.event.points, 0)
                }, 0)

                const pickPoints = pick?.isCorrect 
                  ? (episode.isFinale ? winnerPickPoints : eliminationPickPoints)
                  : 0
                const totalEpisodePoints = episodePoints + pickPoints

                return (
                  <div
                    key={episode.id}
                    className={`px-3 py-2.5 ${!isAired ? 'opacity-40': ''}`}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Link
                          href={`/survivor/seasons/${season.id}/episodes/${episode.id}`}
                          className="text-xs font-medium text-gray-900 hover:text-green-700 transition-colors"
                        >
                          Ep {episode.number} - {episode.name}
                        </Link>
                        {isAired && pick && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Voted: {pick.contestant.survivorPlayer.name.split(' ')[0]}
                            {' '}
                            {pick.isCorrect && (
                              <span className="text-green-600">
                                +{eliminationPickPoints}
                              </span>
                            )}
                          </p>
                        )}
                        {isAired && !pick && (
                          <p className="text-xs text-gray-400 mt-0.5">No pick</p>
                        )}
                      </div>
                      <div className="text-right">
                        {isAired && (
                          <p className={`text-xs font-medium ${
                            totalEpisodePoints > 0 ? 'text-green-700' : 'text-gray-400'
                          }`}>
                            {totalEpisodePoints > 0 ? `+${totalEpisodePoints}` : totalEpisodePoints}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 gap-2 px-3 py-2.5 bg-gray-50 border-t border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-900">Total</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {eliminationPicks.filter(p => p.isCorrect).length} of {eliminationPicks.length} correct picks.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-700">
                  {totalPoints + (eliminationPicks.filter(p => p.isCorrect).length * eliminationPickPoints)} pts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2/3 - existing tribe content */}
        <div className="flex-1 min-w-0">
          {/* No picks state */}
          {!hasPicks ? (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">
                {isMyTribe
                  ? "You haven't picked your tribe yet"
                  : `${tribe.user.username} hasn't picked their tribe yet`
                }
              </p>
              {isMyTribe && (
                <button
                  onClick={() => router.push(`/dashboard/survivor/${leagueId}/tribe/pick`)}
                  className="mt-4 px-6 py-2.5 text-sm rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors font-medium"
                >
                  Pick your tribe
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {tribe.players.map(pick => {
                const contestant = pick.contestant
                const points = contestant.episodeStats
                  .filter(s => airedEpisodeIds.has(s.episode.id))
                  .reduce((sum, s) => sum + s.event.points, 0)
                const currentTribe = contestant.tribeMemberships[0]?.tribe
                const isEliminated = contestant.status === 'eliminated'
                const statusStyle = STATUS_STYLES[contestant.status] ?? 'border-gray-200'
                const statusBadge = STATUS_BADGE[contestant.status]

                return (
                  <div
                    key={pick.id}
                    className={`bg-white border-2 rounded-xl p-4 flex flex-col items-center gap-2 ${statusStyle}`}
                  >
                    {/* Photo */}
                    <div className="relative w-20 h-20 rounded-full overflow-hidden">
                      {contestant.imageUrl ? (
                        <Image
                          src={contestant.imageUrl}
                          alt={contestant.survivorPlayer.name}
                          fill
                          className={`object-cover ${isEliminated ? 'grayscale' : ''}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-2xl text-gray-400">
                            {contestant.survivorPlayer.name[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <p className={`text-sm font-medium text-center leading-tight ${
                      isEliminated ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {contestant.survivorPlayer.name}
                    </p>

                    {/* Tribe */}
                    {currentTribe && (
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: currentTribe.color }}
                        />
                        <p className="text-xs text-gray-400">{currentTribe.name}</p>
                      </div>
                    )}

                    {/* Status badge */}
                    {statusBadge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    )}

                    {/* Points */}
                    <span className={`text-sm font-medium ${
                      isEliminated ? 'text-gray-400' : 'text-green-700'
                    }`}>
                      {points} pts
                    </span>

                    {/* Bio link */}
                    <Link
                      href={`/survivor/players/${contestant.survivorPlayerId}`}
                      className="text-xs text-green-700 hover:text-green-800 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      View profile →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}