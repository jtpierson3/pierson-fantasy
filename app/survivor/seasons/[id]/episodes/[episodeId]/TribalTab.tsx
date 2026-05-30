'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { EpisodeWithDetails } from './types'
import { getContestantTribe } from '@/app/lib/survivorHelpers'

type Props = {
  episode: EpisodeWithDetails
}

export default function TribalTab({ episode }: Props) {
  if (episode.tribalCouncils.length === 0) {
    return <p className="text-sm text-gray-400">No tribal council recorded for this episode.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-sm font-medium text-gray-900">Tribal Council</h3>
      {episode.tribalCouncils.map((tc, index) => {
        // Group votes by who was voted for
        const votesByTarget = tc.votes.reduce((acc, vote) => {
          const id = vote.votedForId
          if (!acc[id]) acc[id] = { target: vote.votedFor, votes: [] }
          acc[id].votes.push(vote)
          return acc
        }, {} as Record<string, {
          target: EpisodeWithDetails['tribalCouncils'][0]['votes'][0]['votedFor']
          votes: EpisodeWithDetails['tribalCouncils'][0]['votes']
        }>)

        // Sort by effective vote count descending
        const sortedTargets = Object.values(votesByTarget)
          .sort((a, b) =>
            b.votes.filter(v => !v.isRevoked).length -
            a.votes.filter(v => !v.isRevoked).length
          )

        const eliminatedTribe = tc.eliminated
          ? getContestantTribe(tc.eliminated)
          : null
        const isNoVote = ['medevac', 'quit'].includes(tc.eliminated?.status ?? '')

        return (
          <div key={tc.id} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                Tribal Council{episode.tribalCouncils.length > 1 ? ` ${index + 1}` : ''}
              </span>
              {tc.isFiremaking && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                  🔥 Firemaking
                </span>
              )}
              {tc.eliminated && (
                <Link
                  href={`/survivor/players/${tc.eliminated.survivorPlayerId}`}
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: eliminatedTribe?.color ?? '#6b7280' }}
                >
                  {tc.eliminated.survivorPlayer.name} voted out
                  {isNoVote ? ' (No Vote)' : ''}
                </Link>
              )}
            </div>

            {/* Vote table */}
            {sortedTargets.length > 0 && (
              <div className="divide-y divide-gray-50">
                {/* Table header */}
                <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-50/50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <div>Received Votes</div>
                  <div>Voted By</div>
                </div>

                {sortedTargets.map(({ target, votes }) => {
                  const targetTribe = getContestantTribe(target, episode.survivorSeason.episodes, episode.number)
                  const effectiveVotes = votes.filter(v => !v.isRevoked)
                  const revokedVotes = votes.filter(v => v.isRevoked)

                  return (
                    <div
                      key={target.id}
                      className="grid grid-cols-2 gap-4 px-4 py-3 items-start"
                    >
                      {/* Who received votes */}
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {target.imageUrl ? (
                            <Image
                              src={target.imageUrl}
                              alt={target.survivorPlayer.name}
                              fill
                              className="object-cover object-[center_top]"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: targetTribe?.color ?? '#6b7280' }}
                            >
                              <span className="text-white text-xs">
                                {target.survivorPlayer.name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Link 
                            href={`/survivor/players/${target.survivorPlayerId}`}
                            className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors"
                          >
                            {target.survivorPlayer.name}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {effectiveVotes.length} vote{effectiveVotes.length !== 1 ? 's' : ''}
                            {revokedVotes.length > 0 && (
                              <span className="text-orange-500 ml-1">
                                ({revokedVotes.length} revoked)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Who voted for them */}
                      <div className="flex flex-wrap gap-1.5">
                        {votes.map(vote => {
                          const voterTribe = getContestantTribe(vote.voter, episode.survivorSeason.episodes, episode.number)
                          return (
                            <Link
                              href={`/survivor/players/${vote.voter.survivorPlayerId}`}
                              key={vote.id}
                              className={`text-xs px-2 py-0.5 rounded-lg text-white font-medium ${
                                vote.isRevoked ? 'opacity-40 line-through' : ''
                              }`}
                              style={{ backgroundColor: voterTribe?.color ?? '#6b7280' }}
                            >
                              {vote.voter.survivorPlayer.name.split(' ')[0]}
                              {vote.isRevoked && ' 🔮'}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Notes */}
            {tc.notes && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 italic">{tc.notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}