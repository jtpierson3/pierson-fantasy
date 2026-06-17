'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { getContestantTribe } from '@/app/lib/survivorHelpers'
import { fchmod } from 'fs'

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    tribeMemberships: { include: { tribe: true }, orderBy: { id: 'asc' } }
    challengeResults: {
        where: { placement: 1}
        include: { challenge: true}
    }
    votesReceived: { where: { isRevoked: false } }
    episodeStats: { include: { event: true } }
  }
}>

type EpisodeWithDetails = Prisma.EpisodeGetPayload<{
  include: {
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
            tribeMemberships: { include: { tribe: true }, orderBy: { id: 'asc' } }
          }
        }
      }
    }
  }
}>

type Props = {
  episodes: EpisodeWithDetails[]
  contestants: ContestantWithDetails[]
}

type TribalColumn = {
  episodeId: string
  episodeNumber: number
  tribalCouncilId: string
  tribalOrder: number
  eliminated: EpisodeWithDetails['tribalCouncils'][0]['eliminated']
  votes: EpisodeWithDetails['tribalCouncils'][0]['votes']
  isFiremaking: boolean
  isFinalTribal: boolean
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatVoteCount(
  eliminatedId: string,
  votes: { votedForId: string; isRevoked: boolean }[]
): string {
  const effectiveVotes = votes.filter(v => !v.isRevoked)
  const tally = new Map<string, number>()
  effectiveVotes.forEach(v => {
    tally.set(v.votedForId, (tally.get(v.votedForId) ?? 0) + 1)
  })
  if (tally.size === 0) return 'No Vote'
  const sorted = Array.from(tally.entries())
    .sort((a, b) => {
      if (a[0] === eliminatedId) return -1
      if (b[0] === eliminatedId) return 1
      return b[1] - a[1]
    })
  return sorted.map(([, count]) => count).join('-')
}

export default function VotingHistoryTab({ episodes, contestants }: Props) {
  // Build tribal council columns — one per tribal council that has an elimination
  const regularColumns: TribalColumn[] = []
  const finalTribal: TribalColumn[] = []

  episodes.forEach(episode => {
    episode.tribalCouncils.forEach(tc => {
      if (tc.votes.length === 0 && !tc.eliminated) return // skip no-elimination tribals
      const col: TribalColumn = {
        episodeId: episode.id,
        episodeNumber: episode.number,
        tribalCouncilId: tc.id,
        tribalOrder: tc.order,
        eliminated: tc.eliminated,
        votes: tc.votes,
        isFiremaking: tc.isFiremaking,
        isFinalTribal: tc.isFinalTribal
      }
      if (tc.isFinalTribal) {
        finalTribal.push(col)
      } else {
        regularColumns.push(col)
      }
    })
  })

  const finalists = contestants.filter(c => 
    ['finalist', 'winner'].includes(c.status)
  )

  const finalistColumns = finalists
    .sort((a, b) => (b.placement ?? 0) - (a.placement ?? 0))
    .map(finalist => ({
        contestantId: finalist.id,
        name: finalist.survivorPlayer.name.split(' ')[0],
        tribe: getContestantTribe(finalist),
        votes: finalTribal.flatMap(col =>
            col.votes.filter(v => v.votedForId === finalist.id)
        ),
  }))

  const columns = [...regularColumns]


  // Build contestant map for quick lookup
  const contestantMap = new Map(contestants.map(c => [c.id, c]))

  // Sort contestants: alphabetical first, then eliminated in order
  const eliminated = contestants
    .filter(c => c.placement !== null && ['eliminated', 'jury', 'medevac', 'quit'].includes(c.status))
    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))

  const active = contestants
    .filter(c => ['active'].includes(c.status))
    .sort((a, b) => a.survivorPlayer.name.localeCompare(b.survivorPlayer.name))

  const finalistsAndWinner = contestants
    .filter(c => ['finalist', 'winner'].includes(c.status))
    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))

  const sortedContestants = [...finalistsAndWinner, ...active, ...eliminated]

  // Track elimination order for finish label
  const elimOrderMap = new Map<string, number>()
  eliminated.forEach((c, i) => elimOrderMap.set(c.id, i + 1))

  // For each contestant and tribal council, figure out their vote
  function getVoteForContestant(contestantId: string, column: TribalColumn) {
    const contestantVotes = column.votes.filter(v => v.voterId === contestantId)
    if (contestantVotes.length === 0) return null // didn't vote or wasn't there

    return contestantVotes.map(v => ({
      votedForId: v.votedForId,
      votedForName: v.votedFor.survivorPlayer.name.split(' ')[0],
      isRevoked: v.isRevoked,
    }))
  }

  // Get tribe color for a contestant at a given tribal
  function getVotedForColor(votedForId: string, episodeNumber: number): string {
    const c = contestantMap.get(votedForId)
    if (!c) return '#6b7280'
    const tribe = getContestantTribe(c, episodes, episodeNumber)
    return tribe?.color ?? '#6b7280'
  }

  // Check if contestant was at this tribal
  function wasAtTribal(contestantId: string, column: TribalColumn): boolean {
    return column.votes.some(v => v.voterId === contestantId)
  }

  // Check if vote was stolen
  function hadVoteStolen(contestantId: string, column: TribalColumn): boolean {
    const wasPresent = wasAtTribal(contestantId, column)
    const didVote = column.votes.some(v => v.voterId === contestantId)
    return wasPresent && !didVote
  }

  if (columns.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-4">Voting History</h2>
        <p className="text-sm text-gray-400">No tribal councils recorded yet.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 mb-4">Voting History</h2>
      <div className="overflow-x-auto max-w-full">
        <table className="border-collapse min-w-max text-xs">
          {/* Three-row header */}
          <thead>
            {/* Row 1 — Episode numbers */}
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-500 bg-gray-50 sticky left-0 z-10 min-w-[160px]">
                Contestant
              </th>
              {columns.map(col => (
                <th
                  key={col.tribalCouncilId}
                  className="px-2 py-2 text-center font-medium text-gray-500 bg-gray-50 min-w-[80px]"
                >
                  Ep. {col.episodeNumber}
                  {col.tribalOrder > 1 && (
                    <span className="text-gray-400"> (TC{col.tribalOrder})</span>
                  )}
                </th>
              ))}
              {finalistColumns.length > 0 && (
                <th
                    colSpan={finalistColumns.length}
                    className="px-2 py-2 text-center font-medium text-yellow-700 bg-yellow-50 border-l border-yellow-200"
                >
                    Final
                </th>
              )}
            </tr>

            {/* Row 2 — Voted out photo + name */}
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 bg-gray-50 sticky left-0 z-10" />
              {columns.map(col => {
                const tribe = col.eliminated?.tribeMemberships[col.eliminated?.tribeMemberships.length - 1]?.tribe
                const isNoVote = ['medevac', 'quit'].includes(col.eliminated?.status ?? '')
                return (
                  <th
                    key={col.tribalCouncilId}
                    className="px-2 py-2 text-center min-w-[80px]"
                    style={{ backgroundColor: tribe?.color ? `${tribe.color}33` : '#f9fafb' }}
                  >
                    {col.eliminated ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          {col.eliminated.imageUrl ? (
                            <Image
                              src={col.eliminated.imageUrl}
                              alt={col.eliminated.survivorPlayer.name}
                              fill
                              className="object-cover object-[center_top]"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: tribe?.color ?? '#6b7280' }}
                            >
                              <span className="text-white font-medium">
                                {col.eliminated.survivorPlayer.name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/survivor/players/${col.eliminated.survivorPlayerId}`}
                          className="font-medium text-xs hover:underline transition-colors"
                          style={{ color: tribe?.color ?? '#374151' }}
                        >
                          {col.eliminated.survivorPlayer.name.split(' ')[0]}
                        </Link>
                      </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">-</span>
                            </div>
                            <span className="text-gray-400 text-xs">No Boot</span>
                        </div>
                    )}
                  </th>
                )
              })}
              {finalistColumns.map(f => {
                const contestant = contestantMap.get(f.contestantId)
                
                return (
                    <th
                        key={f.contestantId}
                        className="px-2 py-2 text-center min-w-[80px] border-l first:border-l-yellow-200"
                        style={{ backgroundColor: f.tribe?.color ? `${f.tribe.color}33` : '#fefce8'}}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                {contestant?.imageUrl ? (
                                    <Image 
                                        src={contestant.imageUrl}
                                        alt={f.name}
                                        fill
                                        className="object-cover object-[center_top]"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center"
                                        style={{ backgroundColor: f.tribe?.color ?? '#6b7280'}}
                                    >
                                        <span className="text-white font-medium text-xs">{f.name[0]}</span>
                                    </div>
                                )}
                            </div>
                            <span
                                className="font-medium text-xs"
                                style={{ color: f.tribe?.color ?? '#374151'}}
                            >
                                {f.name}
                            </span>
                        </div>
                    </th>
                )
              })}
            </tr>

            {/* Row 3 — Vote count */}
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 bg-gray-50 sticky left-0 z-10 text-left text-gray-400 font-normal">
                Vote
              </th>
              {columns.map(col => {
                const isNoVote = ['medevac', 'quit'].includes(col.eliminated?.status ?? '')
                const voteCount = !col.eliminated
                  ? 'Tie'
                  : isNoVote
                  ? 'No Vote'
                  : formatVoteCount(col.eliminated.id, col.votes)

                return(
                    <th
                        key={col.tribalCouncilId}
                        className="px-2 py-2 text-center font-medium text-gray-700 bg-gray-50 min-w-[80px]"
                    >
                        {voteCount}
                    </th>
                )    
              })}
              {finalistColumns.length > 0 && (
                <th
                    colSpan={finalistColumns.length}
                    className="px-2 py-2 text-center font-medium text-yellow-600 bg-yellow-50 min-w-[80px] border-l border-yellow-200"
                >
                    {finalistColumns.map(f => f.votes.length).join('-')}
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedContestants.map(contestant => {
              const tribes = [...contestant.tribeMemberships].sort((a, b) => {
                if (!a.episodeId && !b.episodeId) return 0
                if (!a.episodeId) return -1
                if (!b.episodeId) return 1
                return 0
              })

              const isEliminated = !['winner', 'finalist', 'active'].includes(contestant.status)

              return (
                <tr
                  key={contestant.id}
                  className={`border-b border-gray-100 `}
                >
                  {/* Contestant column */}
                  <td className="px-3 py-2 bg-white sticky left-0 z-10 border-r border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {contestant.imageUrl ? (
                          <Image
                            src={contestant.imageUrl}
                            alt={contestant.survivorPlayer.name}
                            fill
                            className={`object-cover object-[center_top] ${isEliminated ? 'grayscale' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">
                              {contestant.survivorPlayer.name[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                            href={`/survivor/players/${contestant.survivorPlayerId}`}
                            className="font-medium text-gray-900 whitespace-nowrap hover:text-green-700 transition-colors"
                        >
                          {contestant.survivorPlayer.name}
                        </Link>
                        {/* Tribe badges */}
                        <div className="flex gap-0.5 mt-0.5 flex-wrap">
                          {tribes.map(tm => (
                            <span
                              key={tm.id}
                              className="text-white px-1 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: tm.tribe.color,
                                fontSize: '9px'
                              }}
                            >
                              {tm.tribe.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Vote cells */}
                  {columns.map(col => {
                    const votes = getVoteForContestant(contestant.id, col)
                    const stolenVote = hadVoteStolen(contestant.id, col)
                    const wasPresent = wasAtTribal(contestant.id, col)

                    // Wasn't at this tribal
                    if (!wasPresent) {
                      return (
                        <td key={col.tribalCouncilId} className="px-2 py-2 text-center bg-gray-50">
                          <span className="text-gray-300">—</span>
                        </td>
                      )
                    }

                    // Vote stolen — show None
                    if (stolenVote) {
                      return (
                        <td key={col.tribalCouncilId} className="px-2 py-2 text-center bg-gray-100">
                          <span className="text-gray-400">None</span>
                        </td>
                      )
                    }

                    // No votes cast
                    if (!votes || votes.length === 0) {
                      return (
                        <td key={col.tribalCouncilId} className="px-2 py-2 text-center">
                          <span className="text-gray-300">—</span>
                        </td>
                      )
                    }

                    // Show votes
                    return (
                      <td key={col.tribalCouncilId} className="px-2 py-2 text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          {votes.map((vote, i) => {
                            const color = getVotedForColor(vote.votedForId, col.episodeNumber)
                            return (
                              <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded text-white font-medium inline-block ${
                                  vote.isRevoked ? 'line-through opacity-50' : ''
                                }`}
                                style={{ backgroundColor: color, fontSize: '10px' }}
                              >
                                {vote.votedForName}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                  {finalistColumns.map((f, index) => {
                    const isAnyFinalist = finalistColumns.some(fc => fc.contestantId === contestant.id)

                    if (isAnyFinalist) {
                        if (index === 0 ) {
                            return (
                                <td
                                    key={f.contestantId}
                                    colSpan={finalistColumns.length}
                                    className="px-2 py-2 text-center"
                                    style={{ backgroundColor: f.tribe?.color ? `${f.tribe.color}44` : '#fefce8'}}
                                >
                                    <span className="text-xs text-gray-900 font-large">
                                        {contestant.status.toUpperCase()}
                                    </span>
                                </td>
                            )
                        }

                        return null
                    }

                    const voted = f.votes.find(v => v.voterId === contestant.id)
                    if (voted) {
                        return (
                            <td
                                key={f.contestantId}
                                className="px-2 py-2 text-center"
                                style={{ backgroundColor: f.tribe?.color ? `${f.tribe.color}22`: '#fefce8'}}
                            >
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                                    style={{ backgroundColor: f.tribe?.color ?? '#6b7280' }}
                                >
                                    {f.name}
                                </span>
                            </td>
                        )
                    }

                    return (
                        <td
                            key={f.contestantId}
                            className="px-2 py-2 text-center bg-yellow-50/20"
                        >
                            <span className="text-gray-300">-</span>
                        </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}