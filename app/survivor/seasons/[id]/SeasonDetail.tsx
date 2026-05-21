'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import FormattedText from '@/app/components/FormattedText'
import CastawaysTab from './CastawaysTab'
import SeasonSummaryTab from './SeasonSummaryTab'
import VotingHistoryTab from './VotingHistoryTab'

type SeasonWithDetails = Prisma.SurvivorSeasonGetPayload<{
  include: {
    contestants: {
      include: {
        survivorPlayer: true
        tribeMemberships: { include: { tribe: true } }
        challengeResults: {
          where: { placement: 1 }
          include: { challenge: true }
        }
        votesReceived: { where: { isRevoked: false } }
        episodeStats: { include: { event: true } }
      }
    }
    episodes: {
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
    }
    tribes: true
    scoringEvents: true
  }
}>

type Props = {
  season: SeasonWithDetails
}

type Tab = 'production' | 'twists' | 'castaways' | 'summary' | 'voting'

const TABS: { id: Tab; label: string }[] = [
  { id: 'production', label: 'Production' },
  { id: 'twists', label: 'Twists & Changes' },
  { id: 'castaways', label: 'Castaways' },
  { id: 'summary', label: 'Season Summary' },
  { id: 'voting', label: 'Voting History' },
]

export default function SeasonDetail({ season }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('production')

  // Derive winner and runners-up from placement
  const winner = season.contestants.find(c => c.placement === 1)
  const runnersUp = season.contestants.filter(c => c.placement === 2)

  // Derive total days from winner
  const totalDays = winner?.daysLasted ?? null

  // Season run string
  const seasonRun = season.airDate && season.finaleDate
    ? `${new Date(season.airDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — ${new Date(season.finaleDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : season.airDate
    ? new Date(season.airDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/survivor/seasons" className="hover:text-gray-600 transition-colors">
          Seasons
        </Link>
        <span>/</span>
        <span className="text-gray-900">{season.title}</span>
      </div>

      {/* Header — two column layout like PlayerBioCard */}
      <div className="flex gap-6 mb-8">
        {/* Left — title and description */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            {season.title}
          </h1>
          {season.theme && (
            <p className="text-lg text-gray-500 mb-4">{season.theme}</p>
          )}
          {season.isActive && (
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium mb-4">
              Currently Airing
            </span>
          )}
          {season.summary && (
            <FormattedText
              text={season.summary}
              className="text-sm text-gray-600 leading-relaxed"
            />
          )}
        </div>

        {/* Right — stats panel */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {/* Season image */}
            <div className="relative w-full aspect-video bg-gray-200">
              {season.imageUrl ? (
                <Image
                  src={season.imageUrl}
                  alt={season.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center">
                  <p className="text-white/40 text-4xl font-bold">{season.number}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 flex-shrink-0">Season</span>
                <span className="text-gray-900 font-medium text-right">{season.number}</span>
              </div>

              {season.location && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Location</span>
                  <span className="text-gray-900 font-medium text-right">{season.location}</span>
                </div>
              )}

              {seasonRun && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Season run</span>
                  <span className="text-gray-900 font-medium text-right">{seasonRun}</span>
                </div>
              )}

              {season.episodes.length > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Episodes</span>
                  <span className="text-gray-900 font-medium text-right">{season.episodes.length}</span>
                </div>
              )}

              {totalDays && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Days</span>
                  <span className="text-gray-900 font-medium text-right">{totalDays}</span>
                </div>
              )}

              {season.castawayCount && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Castaways</span>
                  <span className="text-gray-900 font-medium text-right">{season.castawayCount}</span>
                </div>
              )}

              {winner && (
                <div className="flex justify-between gap-2 pt-1 border-t border-gray-200">
                  <span className="text-gray-400 flex-shrink-0">Winner</span>
                  <Link
                    href={`/survivor/players/${winner.survivorPlayerId}`}
                    className="text-green-700 hover:text-green-800 font-medium text-right transition-colors"
                  >
                    {winner.survivorPlayer.name}
                  </Link>
                </div>
              )}

              {runnersUp.length > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">
                    {runnersUp.length === 1 ? 'Runner-up' : 'Runners-up'}
                  </span>
                  <div className="text-right">
                    {runnersUp.map(r => (
                      <Link
                        key={r.id}
                        href={`/survivor/players/${r.survivorPlayerId}`}
                        className="block text-green-700 hover:text-green-800 font-medium transition-colors"
                      >
                        {r.survivorPlayer.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tribes */}
              {season.tribes.length > 0 && (
                <div className="flex justify-between gap-2 pt-1 border-t border-gray-200">
                  <span className="text-gray-400 flex-shrink-0">Tribes</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {season.tribes.map(tribe => (
                      <span
                        key={tribe.id}
                        className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: tribe.color }}
                      >
                        {tribe.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Episode navigation */}
              {season.episodes.length > 0 && (
                <div className="pt-1 border-t border-gray-200">
                  <p className="text-gray-400 mb-1.5">Episodes</p>
                  <div className="flex flex-wrap gap-1">
                    {season.episodes.map(ep => (
                      <Link
                        key={ep.id}
                        href={`/survivor/seasons/${season.id}/episodes/${ep.id}`}
                        className="w-7 h-7 flex items-center justify-center text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors"
                      >
                        {ep.number}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — placeholder for now */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        {activeTab === 'production' && (
            <div>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Production</h2>
                {season.production ? (
                    <FormattedText 
                        text={season.production}
                        className="text-sm text-gray-600 leading-relaxed"
                    />
                ) : (
                    <p className="text-sm text-gray-400">No production notes yet.</p>
                )}
            </div>
        )}
        {activeTab === 'twists' && (
            <div>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Twists & Changes</h2>
                {season.twists ? (
                    <FormattedText 
                        text={season.twists}
                        className="text-sm text-gray-600 leading-relaxed"
                    />
                ) : (
                    <p className="text-sm text-gray-400">No twists and changes yet.</p>
                )}
            </div>
        )}
          {activeTab === 'castaways' && (
            <CastawaysTab 
                contestants={season.contestants}
                season={season}
            />
          )}
          {activeTab === 'summary' && (
            <SeasonSummaryTab 
                episodes={season.episodes}
                contestants={season.contestants}
                seasonId={season.id}
            />
          )}
          {activeTab === 'voting' && (
            <VotingHistoryTab 
                episodes={season.episodes}
                contestants={season.contestants}
            />
          )}
      </div>
    </div>
  )
}