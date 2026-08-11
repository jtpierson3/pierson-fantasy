'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { EpisodeWithDetails } from './types'
import { getContestantTribe } from '@/app/lib/survivorHelpers'

type Props = {
  episode: EpisodeWithDetails
}

export default function StoryTab({ episode }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Group stats by day (order field)
  const statsByDay = episode.stats.reduce((acc, stat) => {
    const day = stat.order
    if (!acc[day]) acc[day] = []
    acc[day].push(stat)
    return acc
  }, {} as Record<number, typeof episode.stats>)

  const days = Object.keys(statsByDay)
    .map(Number)
    .sort((a, b) => a - b)

  // Within each day, group by event
  function groupByEvent(stats: typeof episode.stats) {
    const grouped = new Map<string, typeof episode.stats>()
    stats.forEach(stat => {
      const key = stat.event.label
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(stat)
    })
    return grouped
  }

  function toggleExpanded(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {days.length > 0 && (
        <div className="flex flex-col gap-6">
          {days.map(day => {
            const grouped = groupByEvent(statsByDay[day])

            return (
              <div key={day}>
                {/* Day subheader */}
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Day {day}
                  </h4>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Events for this day */}
                <div className="flex flex-col gap-2">
                  {Array.from(grouped.entries()).map(([eventLabel, stats]) => {
                    const expandKey = `${day}-${eventLabel}`
                    const isExpanded = expandedKeys.has(expandKey)
                    const isGroup = stats.length > 1

                    if (isGroup) {
                      // Multiple contestants — show as accordion
                      return (
                        <div key={expandKey} className="border border-gray-100 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleExpanded(expandKey)}
                            className="w-full flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          >
                            {/* Overlapping avatars */}
                            <div className="flex -space-x-2 flex-shrink-0">
                              {stats.slice(0, 4).map(stat => {
                                const t = getContestantTribe(stat.contestant, episode.survivorSeason.episodes, episode.number)
                                return (
                                  <div
                                    key={stat.id}
                                    className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-white flex-shrink-0"
                                  >
                                    {stat.contestant.imageUrl ? (
                                      <Image
                                        src={stat.contestant.imageUrl}
                                        alt={stat.contestant.survivorPlayer.name}
                                        fill
                                        className="object-cover object-[center_top]"
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-full flex items-center justify-center"
                                        style={{ backgroundColor: t?.color ?? '#6b7280' }}
                                      >
                                        <span className="text-white text-xs">
                                          {stat.contestant.survivorPlayer.name[0]}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              {stats.length > 4 && (
                                <div className="relative w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-gray-500">+{stats.length - 4}</span>
                                </div>
                              )}
                            </div>

                            {/* Event label */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-600">{eventLabel}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {stats.length} players
                              </span>
                            </div>

                            {/* Points + chevron */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-sm font-medium ${
                                stats[0].event.points >= 0 ? 'text-green-700' : 'text-red-500'
                              }`}>
                                {stats[0].event.points >= 0 ? '+' : ''}{stats[0].event.points} each
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

                          {/* Expanded contestants */}
                          {isExpanded && (
                            <div className="divide-y divide-gray-50">
                              {stats.map(stat => {
                                const t = getContestantTribe(stat.contestant, episode.survivorSeason.episodes, episode.number)
                                return (
                                  <div
                                    key={stat.id}
                                    className="flex items-center gap-3 px-3 py-2"
                                  >
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                      {stat.contestant.imageUrl ? (
                                        <Image
                                          src={stat.contestant.imageUrl}
                                          alt={stat.contestant.survivorPlayer.name}
                                          fill
                                          className="object-cover object-[center_top]"
                                        />
                                      ) : (
                                        <div
                                          className="w-full h-full flex items-center justify-center"
                                          style={{ backgroundColor: t?.color ?? '#6b7280' }}
                                        >
                                          <span className="text-white text-xs">
                                            {stat.contestant.survivorPlayer.name[0]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-sm text-gray-700">
                                      {stat.contestant.survivorPlayer.name.split(' ')[0]}
                                    </span>
                                    {t && (
                                      <span
                                        className="text-xs px-1.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: t.color }}
                                      >
                                        {t.name}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Single contestant — show as before
                    const stat = stats[0]
                    const t = stat.contestant.tribeMemberships[0]?.tribe
                    return (
                      <div
                        key={expandKey}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                      >
                        <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                          {stat.contestant.imageUrl ? (
                            <Image
                              src={stat.contestant.imageUrl}
                              alt={stat.contestant.survivorPlayer.name}
                              fill
                              className="object-cover object-[center_top]"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: t?.color ?? '#6b7280' }}
                            >
                              <span className="text-white text-xs">
                                {stat.contestant.survivorPlayer.name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">
                            {stat.contestant.survivorPlayer.name.split(' ')[0]}
                          </span>
                          <span className="text-sm text-gray-500 ml-1.5">
                            {stat.event.label}
                          </span>
                        </div>
                        <span className={`text-sm font-medium flex-shrink-0 ${
                          stat.event.points >= 0 ? 'text-green-700' : 'text-red-500'
                        }`}>
                          {stat.event.points >= 0 ? '+' : ''}{stat.event.points}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!episode.description && days.length === 0 && (
        <p className="text-sm text-gray-400">No story content yet.</p>
      )}
    </div>
  )
}