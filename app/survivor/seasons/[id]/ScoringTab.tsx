'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'

type ContestantWithStats = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    tribeMemberships: { include: { tribe: true } }
    episodeStats: {
      include: { event: true; episode: true }
    }
  }
}>

type Props = {
  contestants: ContestantWithStats[]
}

export default function ScoringTab({ contestants }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Calculate total points per contestant and sort
  const sorted = contestants
    .map(c => ({
      contestant: c,
      total: c.episodeStats.reduce((sum, s) => sum + s.event.points, 0),
      byEpisode: c.episodeStats.reduce((acc, stat) => {
        const id = stat.episodeId
        if (!acc[id]) acc[id] = { episode: stat.episode, stats: [], total: 0 }
        acc[id].stats.push(stat)
        acc[id].total += stat.event.points
        return acc
      }, {} as Record<string, {
        episode: ContestantWithStats['episodeStats'][0]['episode']
        stats: ContestantWithStats['episodeStats']
        total: number
      }>)
    }))
    .sort((a, b) => b.total - a.total)

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">No scoring recorded yet.</p>
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 mb-4">Season Scoring</h2>
      <div className="flex flex-col gap-2">
        {sorted.map(({ contestant, total, byEpisode }, index) => {
          const tribe = contestant.tribeMemberships[contestant.tribeMemberships.length - 1]?.tribe
          const isExpanded = expandedId === contestant.id
          const episodesSorted = Object.values(byEpisode)
            .sort((a, b) => a.episode.number - b.episode.number)

          return (
            <div
              key={contestant.id}
              className="border border-gray-100 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : contestant.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Rank */}
                <span className={`text-sm font-medium w-6 flex-shrink-0 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-amber-600' :
                  'text-gray-300'
                }`}>
                  {index + 1}
                </span>

                {/* Image */}
                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  {contestant.imageUrl ? (
                    <Image
                      src={contestant.imageUrl}
                      alt={contestant.survivorPlayer.name}
                      fill
                      className="object-cover object-[center_top]"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                    >
                      <span className="text-white text-sm">
                        {contestant.survivorPlayer.name[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name + tribe */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/survivor/players/${contestant.survivorPlayerId}`}
                    onClick={e => e.stopPropagation()}
                    className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors"
                  >
                    {contestant.survivorPlayer.name}
                  </Link>
                  {tribe && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tribe.color }}
                      />
                      <p className="text-xs text-gray-400">{tribe.name}</p>
                    </div>
                  )}
                </div>

                {/* Total points + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-medium ${
                    total >= 0 ? 'text-green-700' : 'text-red-500'
                  }`}>
                    {total >= 0 ? '+' : ''}{total} pts
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 8L1 3h10L6 8z" />
                  </svg>
                </div>
              </button>

              {/* Expanded episodes */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {episodesSorted.map(({ episode, stats, total: epTotal }) => (
                    <div
                      key={episode.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      {/* Episode row */}
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50">
                        <Link
                          href={`/survivor/seasons/${contestant.survivorSeasonId}/episodes/${episode.id}`}
                          className="text-xs font-medium text-gray-600 hover:text-green-700 transition-colors"
                        >
                          Ep {episode.number} — {episode.name}
                        </Link>
                        <span className={`text-xs font-medium ${
                          epTotal >= 0 ? 'text-green-700' : 'text-red-500'
                        }`}>
                          {epTotal >= 0 ? '+' : ''}{epTotal} pts
                        </span>
                      </div>

                      {/* Episode stats */}
                      {stats.map(stat => (
                        <div
                          key={stat.id}
                          className="flex items-center justify-between px-6 py-1.5 border-b border-gray-50 last:border-0"
                        >
                          <span className="text-xs text-gray-500">{stat.event.label}</span>
                          <span className={`text-xs font-medium ${
                            stat.event.points >= 0 ? 'text-green-700' : 'text-red-500'
                          }`}>
                            {stat.event.points >= 0 ? '+' : ''}{stat.event.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Contestant total */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-900">Total</span>
                    <span className={`text-sm font-medium ${
                      total >= 0 ? 'text-green-700' : 'text-red-500'
                    }`}>
                      {total >= 0 ? '+' : ''}{total} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}