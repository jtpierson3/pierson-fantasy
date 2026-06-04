'use client'

import { getContestantTribe } from '@/app/lib/survivorHelpers'
import type { EpisodeWithDetails } from './types'
import Link from 'next/link'

type Props = {
  episode: EpisodeWithDetails
}

export default function ChallengesTab({ episode }: Props) {
  if (episode.challenges.length === 0) {
    return <p className="text-sm text-gray-400">No challenges recorded for this episode.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-gray-900">Challenges</h3>
      {episode.challenges.map(challenge => {
        const winners = challenge.results.filter(r => r.placement === 1)

        return (
          <div key={challenge.id} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Challenge header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                {challenge.type === 'combined' ? 'Reward + Immunity' : challenge.type}
              </span>
              {challenge.isIndividual ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Individual
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Team
                </span>
              )}
              {challenge.isFiremaking && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                  🔥 Firemaking
                </span>
              )}
              {challenge.survivorChallenge ?
              (
                <Link
                  href={`/survivor/challenges/${challenge.survivorChallenge.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors"
                >
                  {challenge.name}
                </Link>  
              ) : (
                <p className="text-sm font-medium text-gray-900">{challenge.name}</p>
              )}
              {challenge.reward && (
                <p className="text-xs text-gray-400">🎁 {challenge.reward}</p>
              )}
            </div>

            {/* Teams */}
            {challenge.teams.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Teams</p>
                <div className="flex gap-3 flex-wrap">
                  {challenge.teams.map(team => {
                    const isWinner = challenge.results.some(
                      r => r.teamId === team.id && r.placement === 1
                    )
                    return (
                      <div
                        key={team.id}
                        className={`border rounded-lg p-2 min-w-[100px] ${
                          isWinner
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {team.color && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                          )}
                          <p className="text-xs font-medium text-gray-900">
                            {team.name ?? 'Team'}
                          </p>
                          {isWinner && <span className="text-xs text-green-600">🏆</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {team.contestants.map(c => (
                            <span key={c.id} className="text-xs text-gray-500">
                              {c.survivorPlayer.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Winners */}
            {winners.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                  {winners.length === 1 ? 'Winner' : 'Winners'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {winners.map(result => {
                    const tribe = result.contestant
                        ? getContestantTribe(result.contestant, episode.survivorSeason.episodes, episode.number)
                        : result.team
                    const name = result.contestant?.survivorPlayer.name
                      ?? result.team?.name
                      ?? 'Unknown'
                    return (
                      <Link
                        href={result.contestant
                            ? `/survivor/players/${result.contestant.survivorPlayerId}`
                            : '#'
                        }
                        key={result.id}
                        className="px-2.5 py-1 rounded-lg text-white text-sm font-medium hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                      >
                        {name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}