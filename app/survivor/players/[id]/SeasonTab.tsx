'use client'

import { useState } from 'react'
import type { PlayerWithDetails, ContestantWithDetails } from './types'
import Link from 'next/link'

type Props = {
  contestant: ContestantWithDetails
  player: PlayerWithDetails
}

export default function SeasonTab({ contestant, player }: Props) {
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null)

  const tribes = [...contestant.tribeMemberships].sort((a, b) => {
    if (!a.episodeId && !b.episodeId) return 0
    if (!a.episodeId) return -1
    if (!b.episodeId) return 1
    return 0
  })

  const challengeWins = contestant.challengeResults.filter(r => r.placement === 1).length
  const votesAgainst = contestant.votesReceived.length
  const totalPoints = contestant.episodeStats.reduce((sum, s) => sum + s.event.points, 0)

  // Build challenge history
  const allChallenges = [
    ...contestant.challengeResults.map(r => ({
      episodeNumber: r.challenge.episode.number,
      challengeName: r.challenge.name,
      challengeType: r.challenge.type,
      survivorChallengeId: r.challenge.survivorChallengeId ?? null,
      result: r.placement === 1 ? 'Won' : 'Lost',
      sitOut: false,
    })),
    ...contestant.sitOuts.map(s => ({
      episodeNumber: s.challenge.episode.number,
      challengeName: s.challenge.name,
      challengeType: s.challenge.type,
      survivorChallengeId: s.challenge.survivorChallengeId ?? null,
      result: '—',
      sitOut: true,
    })),
  ].sort((a, b) => a.episodeNumber - b.episodeNumber)

  // Build voting history by episode
  const voteEpisodes = new Map<string, {
    episodeId: string
    episodeNumber: number
    episodeName: string
    votesGiven: ContestantWithDetails['votesGiven']
    votesReceived: ContestantWithDetails['votesReceived']
    tribe: ContestantWithDetails['tribeMemberships'][0] | null
  }>()

  contestant.votesGiven.forEach(v => {
    const ep = v.tribalCouncil.episode
    if (!voteEpisodes.has(ep.id)) {
      voteEpisodes.set(ep.id, {
        episodeId: ep.id,
        episodeNumber: ep.number,
        episodeName: ep.name,
        votesGiven: [],
        votesReceived: [],
        tribe: tribes[tribes.length - 1] ?? null,
      })
    }
    voteEpisodes.get(ep.id)!.votesGiven.push(v)
  })

  contestant.votesReceived.forEach(v => {
    const ep = v.tribalCouncil.episode
    if (!voteEpisodes.has(ep.id)) {
      voteEpisodes.set(ep.id, {
        episodeId: ep.id,
        episodeNumber: ep.number,
        episodeName: ep.name,
        votesGiven: [],
        votesReceived: [],
        tribe: tribes[tribes.length - 1] ?? null,
      })
    }
    voteEpisodes.get(ep.id)!.votesReceived.push(v)
  })

  const votingHistory = Array.from(voteEpisodes.values())
    .sort((a, b) => a.episodeNumber - b.episodeNumber)

  // Group episode stats by episode
  const statsByEpisode = contestant.episodeStats.reduce((acc, stat) => {
    const id = stat.episodeId
    if (!acc[id]) acc[id] = { episode: stat.episode, stats: [] }
    acc[id].stats.push(stat)
    return acc
  }, {} as Record<string, {
    episode: ContestantWithDetails['episodeStats'][0]['episode']
    stats: ContestantWithDetails['episodeStats']
  }>)

  const episodesSorted = Object.values(statsByEpisode)
    .sort((a, b) => a.episode.number - b.episode.number)

  return (
    <div className="flex flex-col gap-8">
      {/* Season stats */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {tribes.map(tm => (
            <span
              key={tm.id}
              className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
              style={{ backgroundColor: tm.tribe.color }}
            >
              {tm.tribe.name}
            </span>
          ))}
        </div>
        <div className="flex gap-6">
          {contestant.daysLasted && (
            <div>
              <p className="text-lg font-medium text-gray-900">{contestant.daysLasted}</p>
              <p className="text-xs text-gray-400">Days lasted</p>
            </div>
          )}
          <div>
            <p className="text-lg font-medium text-gray-900">{challengeWins}</p>
            <p className="text-xs text-gray-400">Challenge wins</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">{votesAgainst}</p>
            <p className="text-xs text-gray-400">Votes against</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">{totalPoints}</p>
            <p className="text-xs text-gray-400">Fantasy pts</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {contestant.description && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Season Recap</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{contestant.description}</p>
        </div>
      )}

      {/* Challenge history */}
      {allChallenges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Challenge History</h3>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Episode</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Challenge</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Sit-out</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Result</th>
                </tr>
              </thead>
              <tbody>
                {allChallenges.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-600">{c.episodeNumber}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {c.survivorChallengeId ? (
                        <Link
                          href={`/survivor/`}
                          className="text-green-700 hover:text-green-800 transition-colors"
                        >
                          {c.challengeName ?? '-'}
                        </Link>
                      ) : (
                        c.challengeName ?? '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{c.challengeType}</td>
                    <td className="px-3 py-2">
                      {c.sitOut ? (
                        <span className="text-yellow-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {c.result === 'Won' ? (
                        <span className="text-green-700 font-medium">Won</span>
                      ) : c.result === 'Lost' ? (
                        <span className="text-red-500">Lost</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voting history */}
      {votingHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Voting History</h3>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Episode</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">
                    {player.name.split(' ')[0]}&apos;s Votes
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">
                    Voted Against {player.name.split(' ')[0]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {votingHistory.map(row => (
                  <tr key={row.episodeId} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-600">{row.episodeNumber}</td>
                    <td className="px-3 py-2">
                      {row.votesGiven.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.votesGiven.map(v => (
                            <span
                              key={v.id}
                              className={`px-2 py-0.5 rounded text-white text-xs font-medium ${
                                v.isRevoked ? 'line-through opacity-50' : ''
                              }`}
                              style={{ backgroundColor: '#6b7280' }}
                            >
                              {v.votedFor.survivorPlayer.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.votesReceived.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.votesReceived.map(v => (
                            <span
                              key={v.id}
                              className="px-2 py-0.5 rounded text-white text-xs font-medium"
                              style={{ backgroundColor: '#6b7280' }}
                            >
                              {v.voter.survivorPlayer.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scoring accordion */}
      {episodesSorted.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Scoring</h3>
          <div className="flex flex-col gap-2">
            {episodesSorted.map(({ episode, stats }) => {
              const epTotal = stats.reduce((sum, s) => sum + s.event.points, 0)
              const isExpanded = expandedEpisodeId === episode.id

              return (
                <div
                  key={episode.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedEpisodeId(isExpanded ? null : episode.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Episode {episode.number}
                      </p>
                      <p className="text-xs text-gray-400">{episode.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        epTotal >= 0 ? 'text-green-700' : 'text-red-500'
                      }`}>
                        {epTotal >= 0 ? '+' : ''}{epTotal} pts
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className={`text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <path d="M6 8L1 3h10L6 8z" />
                      </svg>
                    </div>
                  </button>

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
                            <span className="text-sm text-gray-600">
                              {stat.event.label}
                            </span>
                          </div>
                          <span className={`text-sm font-medium ${
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

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-medium text-gray-900">Total</p>
              <p className={`text-sm font-medium ${
                totalPoints >= 0 ? 'text-green-700' : 'text-red-500'
              }`}>
                {totalPoints >= 0 ? '+' : ''}{totalPoints} pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}