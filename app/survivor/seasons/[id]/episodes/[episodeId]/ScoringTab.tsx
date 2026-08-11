'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { EpisodeWithDetails } from './types'
import { getContestantTribe } from '@/app/lib/survivorHelpers'

type Props = {
  episode: EpisodeWithDetails
}

export default function ScoringTab({ episode }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Group stats by contestant
  const byContestant = episode.stats.reduce((acc, stat) => {
    const id = stat.contestantId
    if (!acc[id]) acc[id] = { contestant: stat.contestant, stats: [] }
    acc[id].stats.push(stat)
    return acc
  }, {} as Record<string, {
    contestant: EpisodeWithDetails['stats'][0]['contestant']
    stats: EpisodeWithDetails['stats']
  }>)

  // Sort by total points descending
  const sorted = Object.values(byContestant)
    .map(({ contestant, stats }) => ({
      contestant,
      stats: [...stats].sort((a, b) => a.order - b.order),
      total: stats.reduce((sum, s) => sum + s.event.points, 0)
    }))
    .sort((a, b) => b.total - a.total)

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400">No scoring recorded for this episode.</p>
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-4">Episode Scoring</h3>
      <div className="flex flex-col gap-2">
        {sorted.map(({ contestant, stats, total }) => {
          const tribe = getContestantTribe(contestant, episode.survivorSeason.episodes, episode.number)
          const isExpanded = expandedId === contestant.id

          return (
            <div key={contestant.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : contestant.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
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

              {/* Expanded events */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {stats.map(stat => (
                    <div
                      key={stat.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0 bg-gray-50/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-12 flex-shrink-0">
                          Day {stat.order}
                        </span>
                        <span className="text-sm text-gray-600">{stat.event.label}</span>
                      </div>
                      <span className={`text-sm font-medium flex-shrink-0 ${
                        stat.event.points >= 0 ? 'text-green-700' : 'text-red-500'
                      }`}>
                        {stat.event.points >= 0 ? '+' : ''}{stat.event.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}