'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'

type EpisodeWithDetails = Prisma.EpisodeGetPayload<{
  include: {
    challenges: {
      include: {
        results: {
          include: {
            contestant: {
              include: {
                survivorPlayer: true
                tribeMemberships: { include: { tribe: true } }
              }
            }
            team: true
          }
        }
        teams: {
          include: {
            contestants: { include: { survivorPlayer: true } }
            result: true
          }
        }
      }
    }
    tribalCouncils: {
      include: {
        votes: {
          include: {
            voter: { include: { survivorPlayer: true } }
            votedFor: { include: { survivorPlayer: true } }
          }
        }
        eliminated: {
          include: {
            survivorPlayer: true
            tribeMemberships: { include: { tribe: true } }
          }
        }
      }
    }
    stats: {
      include: {
        contestant: {
          include: {
            survivorPlayer: true
            tribeMemberships: { include: { tribe: true } }
          }
        }
        event: true
      }
    }
  }
}>

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    tribeMemberships: { include: { tribe: true } }
    challengeResults: {
        where: { placement: 1}
        include: { challenge: true}
    }
    votesReceived: { where: { isRevoked: false } }
    episodeStats: { include: { event: true } }
  }
}>

type Props = {
  episodes: EpisodeWithDetails[]
  contestants: ContestantWithDetails[]
  seasonId: string
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getVoteTally(votes: { votedForId: string }[]): Map<string, number> {
  const tally = new Map<string, number>()
  votes.forEach(v => {
    tally.set(v.votedForId, (tally.get(v.votedForId) ?? 0) + 1)
  })
  return tally
}

function formatVoteCount(
  eliminatedId: string,
  votes: { votedForId: string; isRevoked: boolean }[]
): string {
  const effectiveVotes = votes.filter(v => !v.isRevoked)
  const tally = getVoteTally(effectiveVotes)

  if (tally.size === 0) return ''

  // Sort by count descending, eliminated person first
  const sorted = Array.from(tally.entries())
    .sort((a, b) => {
      if (a[0] === eliminatedId) return -1
      if (b[0] === eliminatedId) return 1
      return b[1] - a[1]
    })

  return sorted.map(([, count]) => count).join('-')
}

export default function SeasonSummaryTab({ episodes, contestants, seasonId }: Props) {
  // Track elimination order
  const eliminated = contestants
    .filter(c => c.placement !== null && !['winner', 'finalist'].includes(c.status))
    .sort((a, b) => (b.placement ?? 0) - (a.placement ?? 0))

  const elimOrderMap = new Map<string, number>()
  const juryCount = 0
  eliminated.forEach((c, i) => {
    elimOrderMap.set(c.id, i + 1)
  })

  // Count jury members
  const getFinishLabel = (contestantId: string, daysLasted: number | null, status: string, placement: number | null): string => {
    if (status === 'winner') return `Sole Survivor${daysLasted ? `, Day ${daysLasted}` : ''}`
    if (status === 'finalist') {
      return placement === 2
        ? `Runner-Up${daysLasted ? `, Day ${daysLasted}` : ''}`
        : `${getOrdinal(placement ?? 2)} Runner-Up${daysLasted ? `, Day ${daysLasted}` : ''}`
    }
    if (status === 'medevac') return `Medevac'd${daysLasted ? `, Day ${daysLasted}` : ''}`
    if (status === 'quit') return `Quit${daysLasted ? `, Day ${daysLasted}` : ''}`

    const order = elimOrderMap.get(contestantId)
    if (!order) return ''
    return `${getOrdinal(order)} voted out${daysLasted ? `, Day ${daysLasted}` : ''}`
  }

  const contestantMap = new Map(contestants.map(c => [c.id, c]))

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 mb-4">Season Summary</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-40">Episode</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">Air Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-32">
                <div>Reward</div>
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-32">
                <div>Immunity</div>
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">Exiled</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">Journey</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-32">Eliminated</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-28">Finish</th>
            </tr>
          </thead>

          <tbody>
            {episodes.map(episode => {
              const isAired = episode.isAired
              const rowClass = isAired ? '' : 'opacity-40'

              // Challenges
              const rewardChallenges = episode.challenges.filter(c => c.type === 'reward')
              const immunityChallenges = episode.challenges.filter(c => c.type === 'immunity')
              const combinedChallenges = episode.challenges.filter(c => c.type === 'combined')

              // Exiled contestants from stats
              const exiledStats = episode.stats.filter(s =>
                s.event.label.toLowerCase().includes('exiled') ||
                s.event.label.toLowerCase().includes('exile')
              )

              // Journey contestants from stats
              const journeyStats = episode.stats.filter(s =>
                s.event.label.toLowerCase().includes('journey')
              )

              // Get winner display for a challenge
              const getChallengeWinners = (challenge: EpisodeWithDetails['challenges'][0]) => {
                const winners = challenge.results.filter(r => r.placement === 1)
                if (winners.length === 0) return null

                return winners.map(w => {
                  if (w.contestant) {
                    const tribe = w.contestant.tribeMemberships[0]?.tribe
                    return { name: w.contestant.survivorPlayer.name.split(' ')[0], tribe }
                  }
                  if (w.team) {
                    return { name: w.team.name ?? 'Team', tribe: null }
                  }
                  return null
                }).filter(Boolean)
              }

              return (
                <tr
                  key={episode.id}
                  className={`border-b border-gray-100 ${rowClass} ${episode.isMerge ? 'bg-yellow-50' : ''} ${episode.isFinale ? 'bg-purple-50' : ''}`}
                >
                  {/* Episode */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium w-5 text-center">{episode.number}</span>
                      <div>
                        <Link
                          href={`/survivor/seasons/${seasonId}/episodes/${episode.id}`}
                          className="text-gray-900 hover:text-green-700 transition-colors font-medium"
                        >
                          {episode.name}
                        </Link>
                        <div className="flex gap-1 mt-0.5">
                          {episode.isMerge && (
                            <span className="text-xs px-1 py-0.5 rounded bg-yellow-100 text-yellow-700">Merge</span>
                          )}
                          {episode.isFinale && (
                            <span className="text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-700">Finale</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Air date */}
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(episode.airDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Reward challenge */}
                  <td className="px-3 py-2">
                    {combinedChallenges.length > 0 ? null : (
                      <div className="flex flex-col gap-1">
                        {rewardChallenges.map(challenge => {
                          const winners = getChallengeWinners(challenge)
                          return (
                            <div key={challenge.id} className="flex flex-col gap-0.5">
                              {winners?.map((w, i) => w && (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                                  style={{
                                    backgroundColor: w.tribe?.color ?? '#6b7280'
                                  }}
                                >
                                  {w.name}
                                </span>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>

                  {/* Immunity challenge — spans both columns if combined */}
                  {combinedChallenges.length > 0 ? (
                    <td className="px-3 py-2" colSpan={2}>
                      <div className="flex flex-col gap-1">
                        {combinedChallenges.map(challenge => {
                          const winners = getChallengeWinners(challenge)
                          return (
                            <div key={challenge.id} className="flex flex-col gap-0.5">
                              <span className="text-gray-400 text-xs mb-0.5">Reward + Immunity</span>
                              {winners?.map((w, i) => w && (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                                  style={{
                                    backgroundColor: w.tribe?.color ?? '#6b7280'
                                  }}
                                >
                                  {w.name}
                                </span>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  ) : (
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {immunityChallenges.map(challenge => {
                          const winners = getChallengeWinners(challenge)
                          return (
                            <div key={challenge.id} className="flex flex-col gap-0.5">
                              {winners?.map((w, i) => w && (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                                  style={{
                                    backgroundColor: w.tribe?.color ?? '#6b7280'
                                  }}
                                >
                                  {w.name}
                                </span>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )}

                  {/* Exiled */}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      {exiledStats.map(stat => {
                        const tribe = stat.contestant.tribeMemberships[0]?.tribe
                        return (
                          <span
                            key={stat.id}
                            className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                            style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                          >
                            {stat.contestant.survivorPlayer.name.split(' ')[0]}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  {/* Journey */}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      {journeyStats.map(stat => {
                        const tribe = stat.contestant.tribeMemberships[0]?.tribe
                        return (
                          <span
                            key={stat.id}
                            className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                            style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                          >
                            {stat.contestant.survivorPlayer.name.split(' ')[0]}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  {/* Eliminated */}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {episode.tribalCouncils.map(tc => {
                        if (!tc.eliminated) return null
                        const tribe = tc.eliminated.tribeMemberships[0]?.tribe
                        const isNoVote = ['medevac', 'quit'].includes(tc.eliminated.status)
                        const voteCount = isNoVote
                          ? null
                          : formatVoteCount(tc.eliminated.id, tc.votes)

                        return (
                          <div key={tc.id} className="flex flex-col gap-0.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                              style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                            >
                              {tc.eliminated.survivorPlayer.name.split(' ')[0]}
                              {voteCount && ` (${voteCount})`}
                              {isNoVote && ' (No Vote)'}
                              {tc.isFiremaking && ' 🔥'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </td>

                  {/* Finish */}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {episode.tribalCouncils.map(tc => {
                        if (!tc.eliminated) return null
                        const c = contestantMap.get(tc.eliminated.id)
                        if (!c) return null
                        return (
                          <p key={tc.id} className="text-gray-500">
                            {getFinishLabel(c.id, c.daysLasted, c.status, c.placement)}
                          </p>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}