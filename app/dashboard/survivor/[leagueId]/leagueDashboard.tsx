'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type SurvivorPlayer = {
  id: string
  name: string
  imageUrl: string | null
}

type ScoringEvent = {
  points: number
}

type Episode = {
  id: string
  number: number
  name: string
  isAired: boolean
  isMerge: boolean
  isFinale: boolean
}

type EpisodeStat = {
  id: string
  episode: Episode
  event: ScoringEvent
}

type Contestant = {
  id: string
  status: string
  survivorPlayer: SurvivorPlayer
  episodeStats: EpisodeStat[]
}

type SurvivorPick = {
  id: string
  contestant: Contestant
}

type User = {
  id: string
  username: string
}

type Tribe = {
  id: string
  name: string
  userId: string
  user: User
  players: SurvivorPick[]
}

type Season = {
  id: string
  number: number
  title: string
  imageUrl: string | null
  isActive: boolean
  episodes: Episode[]
}

type League = {
  id: string
  name: string
  survivorSeason: Season
  members: { id: string; user: User }[]
  tribes: Tribe[]
}

type PastLeague = {
  id: string
  name: string
  survivorSeason: Season
  tribes: Tribe[]
}

type Props = {
  league: League
  userId: string
  pastLeagues: PastLeague[]
}

const STATUS_STYLES: Record<string, string> = {
  active: '',
  eliminated: 'opacity-40 grayscale',
  jury: 'ring-2 ring-blue-400',
  finalist: 'ring-2 ring-purple-400',
  winner: 'ring-2 ring-yellow-400',
}

const STATUS_BADGE: Record<string, string> = {
  eliminated: 'bg-gray-100 text-gray-500',
  jury: 'bg-blue-100 text-blue-600',
  finalist: 'bg-purple-100 text-purple-600',
  winner: 'bg-yellow-100 text-yellow-600',
}

function calculateTribePoints(tribe: Tribe, airedEpisodeIds: Set<string>): number {
  return tribe.players.reduce((total, pick) => {
    const points = pick.contestant.episodeStats
      .filter(s => airedEpisodeIds.has(s.episode.id))
      .reduce((sum, s) => sum + s.event.points, 0)
    return total + points
  }, 0)
}

function calculateContestantPoints(contestant: Contestant, airedEpisodeIds: Set<string>): number {
  return contestant.episodeStats
    .filter(s => airedEpisodeIds.has(s.episode.id))
    .reduce((sum, s) => sum + s.event.points, 0)
}

export default function LeagueDashboard({ league, userId, pastLeagues }: Props) {
  const router = useRouter()

  const airedEpisodes = league.survivorSeason.episodes.filter(e => e.isAired)
  const airedEpisodeIds = new Set(airedEpisodes.map(e => e.id))
  const lastEpisode = airedEpisodes[0] ?? null
  const nextEpisode = league.survivorSeason.episodes
    .filter(e => !e.isAired)
    .sort((a, b) => a.number - b.number)[0] ?? null

  const myTribe = league.tribes.find(t => t.userId === userId)
  const hasPicks = (myTribe?.players.length ?? 0) > 0

  // Calculate standings
  const standings = league.tribes
    .map(tribe => ({
      tribe,
      points: calculateTribePoints(tribe, airedEpisodeIds),
    }))
    .sort((a, b) => b.points - a.points)

  const myRank = standings.findIndex(s => s.tribe.userId === userId) + 1
  const myPoints = standings.find(s => s.tribe.userId === userId)?.points ?? 0

  // Last episode stats for my tribe
  const lastEpisodeMyPoints = lastEpisode && myTribe
    ? myTribe.players.reduce((total, pick) => {
        return total + pick.contestant.episodeStats
          .filter(s => s.episode.id === lastEpisode.id)
          .reduce((sum, s) => sum + s.event.points, 0)
      }, 0)
    : 0

  // Top scorer last episode across all tribes
  const allContestants = league.tribes.flatMap(t => t.players.map(p => p.contestant))
  const lastEpTopScorer = lastEpisode
    ? allContestants
        .map(c => ({
          name: c.survivorPlayer.name,
          points: c.episodeStats
            .filter(s => s.episode.id === lastEpisode.id)
            .reduce((sum, s) => sum + s.event.points, 0)
        }))
        .sort((a, b) => b.points - a.points)[0]
    : null

  // Eliminated this last episode
  const eliminatedThisEp = lastEpisode
    ? allContestants.find(c =>
        c.status === 'eliminated' &&
        c.episodeStats.some(s => s.episode.id === lastEpisode.id)
      )
    : null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/dashboard/survivor" className="hover:text-gray-600 transition-colors">
            Survivor
          </Link>
          <span>/</span>
          <span className="text-gray-900">{league.name}</span>
        </div>
        <h1 className="text-xl font-medium text-gray-900">{league.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Season {league.survivorSeason.number} · {league.survivorSeason.title}
          {myRank > 0 && ` · ${myRank}${myRank === 1 ? 'st' : myRank === 2 ? 'nd' : myRank === 3 ? 'rd' : 'th'} place`}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left — Standings */}
        <div className="w-1/3">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Standings</h2>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Tribe</div>
              <div className="col-span-4 text-right">Points</div>
            </div>

            {standings.map(({ tribe, points }, index) => {
              const isMe = tribe.userId === userId
              return (
                <div
                  key={tribe.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 last:border-0 text-sm transition-colors ${
                    isMe ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`col-span-1 font-medium ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-amber-600' :
                    'text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="col-span-7 min-w-0">
                    <p className={`font-medium truncate ${isMe ? 'text-green-800' : 'text-gray-900'}`}>
                      {tribe.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{tribe.user.username}</p>
                  </div>
                  <div className={`col-span-4 text-right font-medium ${isMe ? 'text-green-800' : 'text-gray-900'}`}>
                    {points}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — Three sections */}
        <div className="flex-1 flex flex-col gap-4">

          {/* My Tribe */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">
                {myTribe?.name ?? 'My Tribe'}
              </h2>
              <button
                onClick={() => router.push(`/dashboard/survivor/${league.id}/tribe`)}
                className="text-xs text-green-700 hover:text-green-800 font-medium"
              >
                {hasPicks ? 'Manage tribe →' : 'Pick tribe →'}
              </button>
            </div>

            {!hasPicks ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">
                  You haven't picked your tribe yet
                </p>
                <button
                  onClick={() => router.push(`/dashboard/survivor/${league.id}/tribe`)}
                  className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                >
                  Pick your tribe
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-6 gap-3">
                  {myTribe!.players.map(pick => {
                    const points = calculateContestantPoints(pick.contestant, airedEpisodeIds)
                    const isEliminated = pick.contestant.status === 'eliminated'
                    return (
                      <div
                        key={pick.id}
                        className={`flex flex-col items-center gap-1.5 ${isEliminated ? 'opacity-50' : ''}`}
                      >
                        <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${
                          pick.contestant.status === 'winner' ? 'border-yellow-400' :
                          pick.contestant.status === 'finalist' ? 'border-purple-400' :
                          pick.contestant.status === 'jury' ? 'border-blue-400' :
                          isEliminated ? 'border-gray-300' :
                          'border-green-200'
                        }`}>
                          {pick.contestant.survivorPlayer.imageUrl ? (
                            <Image
                              src={pick.contestant.survivorPlayer.imageUrl}
                              alt={pick.contestant.survivorPlayer.name}
                              fill
                              className={`object-cover ${isEliminated ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <span className="text-sm text-gray-500">
                                {pick.contestant.survivorPlayer.name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 text-center leading-tight truncate w-full">
                          {pick.contestant.survivorPlayer.name.split(' ')[0]}
                        </p>
                        <span className="text-xs font-medium text-green-700">
                          {points}pts
                        </span>
                        {pick.contestant.status !== 'active' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[pick.contestant.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {pick.contestant.status}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Total points</p>
                  <p className="text-sm font-medium text-gray-900">{myPoints} pts</p>
                </div>
              </div>
            )}
          </div>

          {/* Last Episode */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">
                {lastEpisode ? `Last Episode — Ep ${lastEpisode.number}` : 'Next Episode'}
              </h2>
            </div>
            <div className="p-4">
              {lastEpisode ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-900">{lastEpisode.name}</p>
                  <div className="flex gap-2 flex-wrap">
                    {lastEpisode.isMerge && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                        Merge episode
                      </span>
                    )}
                    {lastEpisode.isFinale && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                        Finale
                      </span>
                    )}
                  </div>
                  {hasPicks && (
                    <p className="text-sm text-gray-600">
                      Your tribe scored <span className="font-medium text-green-700">+{lastEpisodeMyPoints} pts</span>
                    </p>
                  )}
                  {lastEpTopScorer && lastEpTopScorer.points > 0 && (
                    <p className="text-sm text-gray-600">
                      Top scorer: <span className="font-medium text-gray-900">{lastEpTopScorer.name}</span>
                      {' '}
                      <span className="text-green-700">+{lastEpTopScorer.points} pts</span>
                    </p>
                  )}
                  {eliminatedThisEp && (
                    <p className="text-sm text-gray-600">
                      Eliminated: <span className="font-medium text-red-600">{eliminatedThisEp.survivorPlayer.name}</span>
                    </p>
                  )}
                </div>
              ) : nextEpisode ? (
                <div>
                  <p className="text-sm text-gray-500">No episodes have aired yet</p>
                  <p className="text-sm text-gray-900 mt-1">
                    Next: <span className="font-medium">Ep {nextEpisode.number} · {nextEpisode.name}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No episodes scheduled</p>
              )}
            </div>
          </div>

          {/* Seasons */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Seasons</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {/* Current season */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    {league.survivorSeason.imageUrl ? (
                      <Image
                        src={league.survivorSeason.imageUrl}
                        alt={league.survivorSeason.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-100 flex items-center justify-center">
                        <span className="text-xs text-green-700 font-bold">
                          S{league.survivorSeason.number}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Season {league.survivorSeason.number} · {league.survivorSeason.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {airedEpisodes.length} episodes aired
                      {myRank > 0 && ` · ${myRank}${myRank === 1 ? 'st' : myRank === 2 ? 'nd' : myRank === 3 ? 'rd' : 'th'} place`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{myPoints} pts</span>
                  <Link
                    href={`/survivor/seasons/${league.survivorSeason.id}`}
                    className="text-xs text-green-700 hover:text-green-800"
                    onClick={e => e.stopPropagation()}
                  >
                    Wiki →
                  </Link>
                </div>
              </div>

              {/* Past leagues */}
              {pastLeagues.map(past => {
                const myPastTribe = past.tribes[0]
                const pastAiredIds = new Set(
                  past.survivorSeason.episodes
                    .filter(e => e.isAired)
                    .map(e => e.id)
                )
                const pastPoints = myPastTribe
                  ? calculateTribePoints(myPastTribe as any, pastAiredIds)
                  : 0

                return (
                  <div
                    key={past.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/dashboard/survivor/${past.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        {past.survivorSeason.imageUrl ? (
                          <Image
                            src={past.survivorSeason.imageUrl}
                            alt={past.survivorSeason.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-500 font-bold">
                              S{past.survivorSeason.number}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Season {past.survivorSeason.number} · {past.survivorSeason.title}
                        </p>
                        {myPastTribe && (
                          <p className="text-xs text-gray-400">{myPastTribe.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{pastPoints} pts</span>
                      <Link
                        href={`/survivor/seasons/${past.survivorSeason.id}`}
                        className="text-xs text-green-700 hover:text-green-800"
                        onClick={e => e.stopPropagation()}
                      >
                        Wiki →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}