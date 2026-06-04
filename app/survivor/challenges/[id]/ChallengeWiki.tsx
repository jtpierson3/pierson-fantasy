'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { getContestantTribe } from '@/app/lib/survivorHelpers'

type ChallengeWithHistory = Prisma.SurvivorChallengeGetPayload<{
  include: {
    challenges: {
      include: {
        episode: {
          include: { survivorSeason: true }
        }
        results: {
          include: {
            contestant: {
              include: {
                survivorPlayer: true
                tribeMemberships: { include: { tribe: true } }
              }
            }
            team: {
              include: {
                contestants: { include: { survivorPlayer: true } }
              }
            }
          }
        }
        teams: {
          include: {
            contestants: { include: { survivorPlayer: true } }
            result: true
          }
        }
        sitOuts: {
          include: {
            contestant: {
              include: {
                survivorPlayer: true
                tribeMemberships: { include: { tribe: true } }
              }
            }
          }
        }
        survivorChallenge: {
            include: {
                challenges: true
            }
        }
      }
    }
  }
}>

type Props = {
  challenge: ChallengeWithHistory
}

export default function ChallengeWiki({ challenge }: Props) {
  const [activeTab, setActiveTab] = useState<string>(
    challenge.challenges[0]?.id ?? ''
  )

  const activeChallenge = challenge.challenges.find(c => c.id === activeTab)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/survivor/seasons" className="hover:text-gray-600 transition-colors">
          Survivor
        </Link>
        <span>/</span>
        <span className="text-gray-900">{challenge.name}</span>
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-8">
        {/* Left — name and description */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            {challenge.name}
          </h1>
          <p className="text-base text-gray-500 mb-4">
            Appeared in {challenge.challenges.length} season{challenge.challenges.length !== 1 ? 's' : ''}
          </p>
          {challenge.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {challenge.description}
            </p>
          )}
        </div>

        {/* Right — stats panel */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p
              className="text-gray-400 mb-2 uppercase tracking-wide font-medium"
              style={{ fontSize: '10px' }}
            >
              Season History
            </p>
            <div className="flex flex-col gap-2">
              {challenge.challenges.map(c => (
                <div key={c.id} className="flex justify-between gap-2 text-xs">
                  <Link
                    href={`/survivor/seasons/${c.episode.survivorSeason.id}`}
                    className="text-green-700 hover:text-green-800 transition-colors"
                  >
                    Season {c.episode.survivorSeason.number}
                  </Link>
                  <Link
                    href={`/survivor/seasons/${c.episode.survivorSeason.id}/episodes/${c.episode.id}`}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Ep {c.episode.number}
                  </Link>
                  <span className="text-gray-400 capitalize">{c.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — one per season */}
      {challenge.challenges.length > 0 && (
        <>
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
            {challenge.challenges.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                  activeTab === c.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c.episode.survivorSeason.title}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeChallenge && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <SeasonChallengeTab challenge={activeChallenge} />
            </div>
          )}
        </>
      )}

      {challenge.challenges.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">
            This challenge has not been linked to any episodes yet.
          </p>
        </div>
      )}
    </div>
  )
}

function SeasonChallengeTab({
  challenge,
}: {
  challenge: ChallengeWithHistory['challenges'][0]
}) {
  const winners = challenge.results.filter(r => r.placement === 1)
  const runnerUps = challenge.results.filter(r => r.placement === 2)

  return (
    <div className="flex flex-col gap-6">
      {/* Season + episode info */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={`/survivor/seasons/${challenge.episode.survivorSeason.id}`}
          className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
        >
          Season {challenge.episode.survivorSeason.number} — {challenge.episode.survivorSeason.title}
        </Link>
        <span className="text-gray-300">·</span>
        <Link
          href={`/survivor/seasons/${challenge.episode.survivorSeason.id}/episodes/${challenge.episode.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Episode {challenge.episode.number}
        </Link>
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
        {challenge.reward && (
          <span className="text-xs text-gray-400">🎁 {challenge.reward}</span>
        )}
      </div>

      {/* Description */}
      {challenge.survivorChallenge?.description && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{challenge.survivorChallenge.description}</p>
        </div>
      )}

      {/* Teams */}
      {challenge.teams.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Teams</h3>
          <div className="flex gap-3 flex-wrap">
            {challenge.teams.map(team => {
              const isWinner = challenge.results.some(
                r => r.teamId === team.id && r.placement === 1
              )
              const isRunnerUp = challenge.results.some(
                r => r.teamId === team.id && r.placement === 2
              )
              return (
                <div
                  key={team.id}
                  className={`border rounded-xl p-3 min-w-[140px] ${
                    isWinner
                      ? 'border-green-200 bg-green-50'
                      : isRunnerUp
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {team.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    <p className="text-sm font-medium text-gray-900">
                      {team.name ?? 'Team'}
                    </p>
                    {isWinner && <span className="text-xs text-green-600">🏆</span>}
                    {isRunnerUp && <span className="text-xs text-blue-500">2nd</span>}
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

      {/* Results */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Results</h3>
        <div className="flex flex-col gap-2">
          {/* Winners */}
          {winners.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                {winners.length === 1 ? 'Winner' : 'Winners'}
              </p>
              <div className="flex flex-wrap gap-2">
                {winners.map(result => {
                  const tribe = result.contestant
                    ? getContestantTribe(result.contestant)
                    : null
                  const name = result.contestant?.survivorPlayer.name
                    ?? result.team?.name
                    ?? 'Unknown'
                  const playerId = result.contestant?.survivorPlayerId

                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-200 bg-green-50"
                    >
                      {result.contestant?.imageUrl && (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={result.contestant.imageUrl}
                            alt={name}
                            fill
                            className="object-cover object-[center_top]"
                          />
                        </div>
                      )}
                      <div>
                        {playerId ? (
                          <Link
                            href={`/survivor/players/${playerId}`}
                            className="text-sm font-medium text-green-800 hover:text-green-700 transition-colors"
                          >
                            {name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-green-800">{name}</p>
                        )}
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Runner-ups */}
          {runnerUps.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Runner-up
              </p>
              <div className="flex flex-wrap gap-2">
                {runnerUps.map(result => {
                  const tribe = result.contestant
                    ? getContestantTribe(result.contestant)
                    : null
                  const name = result.contestant?.survivorPlayer.name
                    ?? result.team?.name
                    ?? 'Unknown'
                  const playerId = result.contestant?.survivorPlayerId

                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50"
                    >
                      {result.contestant?.imageUrl && (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={result.contestant.imageUrl}
                            alt={name}
                            fill
                            className="object-cover object-[center_top]"
                          />
                        </div>
                      )}
                      <div>
                        {playerId ? (
                          <Link
                            href={`/survivor/players/${playerId}`}
                            className="text-sm font-medium text-blue-800 hover:text-blue-700 transition-colors"
                          >
                            {name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-blue-800">{name}</p>
                        )}
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sit-outs */}
          {challenge.sitOuts.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Sit-outs
              </p>
              <div className="flex flex-wrap gap-2">
                {challenge.sitOuts.map(s => {
                  const tribe = getContestantTribe(s.contestant)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50"
                    >
                      {s.contestant.imageUrl && (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={s.contestant.imageUrl}
                            alt={s.contestant.survivorPlayer.name}
                            fill
                            className="object-cover object-[center_top]"
                          />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/survivor/players/${s.contestant.survivorPlayerId}`}
                          className="text-sm font-medium text-gray-700 hover:text-green-700 transition-colors"
                        >
                          {s.contestant.survivorPlayer.name}
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}