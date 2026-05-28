'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { EpisodeWithDetails } from './types'

type Props = {
  episode: EpisodeWithDetails
}

export default function StoryTab({ episode }: Props) {
  const statsByDay = episode.stats.reduce((acc, stat) => {
    const day = stat.order
    if (!acc[day]) acc[day] = []
    acc[day].push(stat)
    return acc
  }, {} as Record<number, typeof episode.stats>)

  const days = Object.keys(statsByDay)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-6">
      {/* Description */}
      {episode.description && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Episode Summary</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{episode.description}</p>
        </div>
      )}

      {/* Days */}
      {days.length > 0 && (
        <div className="flex flex-col gap-6">
          {days.map(day => (
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
                {statsByDay[day].map(stat => {
                  const tribe = stat.contestant.tribeMemberships[0]?.tribe
                  return (
                    <div
                      key={stat.id}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                    >
                      {/* Photo */}
                      <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        {stat.contestant.imageUrl ? (
                          <Image
                            src={stat.contestant.imageUrl}
                            alt={stat.contestant.survivorPlayer.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                          >
                            <span className="text-white text-xs">
                              {stat.contestant.survivorPlayer.name[0]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name + event */}
                      <div className="flex-1 min-w-0">
                        <Link
                         href={`/survivor/players/${stat.contestant.survivorPlayerId}`}
                         className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors"
                        >
                          {stat.contestant.survivorPlayer.name.split(' ')[0]}
                        </Link>
                        <span className="text-sm text-gray-500 ml-1.5">
                          {stat.event.label}
                        </span>
                      </div>

                      {/* Points */}
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
          ))}
        </div>
      )}

      {!episode.description && days.length === 0 && (
        <p className="text-sm text-gray-400">No story content yet.</p>
      )}
    </div>
  )
}