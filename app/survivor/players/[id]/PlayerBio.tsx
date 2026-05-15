'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'

type PlayerWithDetails = Prisma.SurvivorPlayerGetPayload<{
  include: {
    contestants: {
      include: {
        survivorSeason: true
        tribeMemberships: {
          include: { tribe: true }
        }
        challengeResults: {
          where: { placement: 1 }
          include: { challenge: true }
        }
        votesReceived: {
          where: { isRevoked: false }
        }
        episodeStats: {
          include: { event: true }
        }
      }
    }
  }
}>

type Props = {
  player: PlayerWithDetails
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  eliminated: { label: 'Eliminated', color: 'bg-gray-100 text-gray-500' },
  jury: { label: 'Jury', color: 'bg-blue-100 text-blue-600' },
  finalist: { label: 'Finalist', color: 'bg-purple-100 text-purple-600' },
  winner: { label: 'Winner', color: 'bg-yellow-100 text-yellow-600' },
}

export default function PlayerBio({ player }: Props) {
  const totalDays = player.contestants.reduce(
    (sum, c) => sum + (c.daysLasted ?? 0), 0
  )
  const totalChallengeWins = player.contestants.reduce(
    (sum, c) => sum + c.challengeResults.length, 0
  )
  const totalVotesAgainst = player.contestants.reduce(
    (sum, c) => sum + c.votesReceived.length, 0
  )
  const totalSeasons = player.contestants.length

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/survivor/seasons" className="hover:text-gray-600 transition-colors">
          Survivor
        </Link>
        <span>/</span>
        <span className="text-gray-900">{player.name}</span>
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-8">
        {/* Photo — use most recent season image */}
        <div className="relative w-36 h-36 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
          {player.contestants[0]?.imageUrl ? (
            <Image
              src={player.contestants[0].imageUrl}
              alt={player.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl text-gray-400">{player.name[0]}</span>
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">{player.name}</h1>

          {/* Personal details from most recent season */}
          {player.contestants[0] && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
              {player.contestants[0].occupation && (
                <span>{player.contestants[0].occupation}</span>
              )}
              {player.contestants[0].hometown && (
                <span>📍 {player.contestants[0].hometown}</span>
              )}
              {player.birthDate && (
                <span>🎂 {new Date(player.birthDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              )}
            </div>
          )}

          {/* Career stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">{totalSeasons}</p>
              <p className="text-xs text-gray-400">Season{totalSeasons !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">{totalDays}</p>
              <p className="text-xs text-gray-400">Days played</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">{totalChallengeWins}</p>
              <p className="text-xs text-gray-400">Challenge wins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">{totalVotesAgainst}</p>
              <p className="text-xs text-gray-400">Votes against</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {player.bio && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">About</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{player.bio}</p>
        </div>
      )}

      {/* Season history */}
      <h2 className="text-sm font-medium text-gray-900 mb-3">Season History</h2>
      <div className="flex flex-col gap-4">
        {player.contestants.map(contestant => {
          const statusBadge = STATUS_BADGE[contestant.status]
          const tribes = contestant.tribeMemberships.map(m => m.tribe)
          const challengeWins = contestant.challengeResults.length
          const votesAgainst = contestant.votesReceived.length
          const totalPoints = contestant.episodeStats.reduce(
            (sum, s) => sum + s.event.points, 0
          )

          return (
            <div
              key={contestant.id}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* Season header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {contestant.imageUrl && (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={contestant.imageUrl}
                        alt={player.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/survivor/seasons/${contestant.survivorSeason.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors"
                    >
                      Season {contestant.survivorSeason.number} — {contestant.survivorSeason.title}
                    </Link>
                    {contestant.survivorSeason.theme && (
                      <p className="text-xs text-gray-400">{contestant.survivorSeason.theme}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  )}
                  {contestant.placement && contestant.survivorSeason.castawayCount && (
                    <span className="text-xs text-gray-400">
                      {contestant.placement}/{contestant.survivorSeason.castawayCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Season details */}
              <div className="px-5 py-4">
                {/* Tribes */}
                {tribes.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs text-gray-400">Tribes:</span>
                    {tribes.map(tribe => (
                      <span
                        key={tribe.id}
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: tribe.color }}
                      >
                        {tribe.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex gap-4 mb-3">
                  {contestant.daysLasted && (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{contestant.daysLasted}</p>
                      <p className="text-xs text-gray-400">Days</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{challengeWins}</p>
                    <p className="text-xs text-gray-400">Challenge wins</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{votesAgainst}</p>
                    <p className="text-xs text-gray-400">Votes against</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{totalPoints}</p>
                    <p className="text-xs text-gray-400">Fantasy pts</p>
                  </div>
                </div>

                {/* Profile */}
                {contestant.profile && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Preseason Profile
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {contestant.profile}
                    </p>
                  </div>
                )}

                {/* Description */}
                {contestant.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Season Recap
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {contestant.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}