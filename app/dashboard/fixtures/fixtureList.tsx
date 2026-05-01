'use client'

import { useState, useCallback } from 'react'
import type { Fixture, Round } from '@/lib/sportmonks'
import Image from 'next/image'

type Props = {
  rounds: Round[]
  initialFixtures: Fixture[]
  initialRoundId: number | null
  seasonId: number
}

function getScore(scores: Fixture['scores'], location: 'home' | 'away') {
  const current = scores?.filter(s => s.description === 'CURRENT')
  return current?.find(s => s.score.participant === location)?.score.goals ?? null
}

function getTeam(participants: Fixture['participants'], location: 'home' | 'away') {
  return participants?.find(p => p.meta.location === location)
}

function getStatusStyle(state: string) {
  if (['FT', 'AET', 'FT_PEN'].includes(state)) return 'bg-gray-100 text-gray-500'
  if (['1H', '2H', 'ET', 'HT', 'LIVE'].includes(state)) return 'bg-green-100 text-green-700'
  return 'bg-blue-50 text-blue-600'
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

const isLiveState = (state: string) => ['1H', '2H', 'ET', 'HT', 'LIVE'].includes(state)
const isFinishedState = (state: string) => ['FT', 'AET', 'FT_PEN'].includes(state)

export default function FixtureList({ rounds, initialFixtures, initialRoundId, seasonId }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures)
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(initialRoundId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentRoundIndex = rounds.findIndex(r => r.id === currentRoundId)
  const currentRound = rounds[currentRoundIndex]

  const navigateToRound = useCallback(async (roundId: number) => {
    setLoading(true)
    setError(null)
    setCurrentRoundId(roundId)
    try {
      const res = await fetch(`/api/sportmonks/fixtures?round=${roundId}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }
      const data = await res.json()
      setFixtures(data.data ?? [])
    } catch {
      setError('Failed to load fixtures')
    } finally {
      setLoading(false)
    }
  }, [])

  const prevRound = useCallback(() => {
    if (currentRoundIndex > 0) {
      navigateToRound(rounds[currentRoundIndex - 1].id)
    }
  }, [currentRoundIndex, rounds, navigateToRound])

  const nextRound = useCallback(() => {
    if (currentRoundIndex < rounds.length - 1) {
      navigateToRound(rounds[currentRoundIndex + 1].id)
    }
  }, [currentRoundIndex, rounds, navigateToRound])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Fixtures</h1>
          <p className="text-sm text-gray-500 mt-1">Scottish Premiership 2025/26</p>
        </div>

        {/* Round navigator */}
        {currentRound && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevRound}
              disabled={currentRoundIndex === 0 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[90px] text-center">
              Round {currentRound.name}
            </span>
            <button
              onClick={nextRound}
              disabled={currentRoundIndex === rounds.length - 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-6 bg-gray-100 rounded w-16" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Fixtures */}
      {!loading && !error && (
        <div className="space-y-3">
          {fixtures.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No fixtures found for this round.
            </p>
          )}

          {fixtures.map((fixture) => {
            const home = getTeam(fixture.participants, 'home')
            const away = getTeam(fixture.participants, 'away')
            const homeScore = getScore(fixture.scores, 'home')
            const awayScore = getScore(fixture.scores, 'away')
            const state = fixture.state?.short_name ?? 'NS'
            const isLive = isLiveState(state)
            const isFinished = isFinishedState(state)
            const { day, time } = formatDate(fixture.starting_at)

            return (
              <div
                key={fixture.id}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
              >
                {/* Date and status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">{day} · {time}</span>
                  <div className="flex items-center gap-2">
                    {fixture.venue && (
                      <span className="text-xs text-gray-400">{fixture.venue.name}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(state)}`}>
                      {isLive ? 'LIVE' : state}
                    </span>
                  </div>
                </div>

                {/* Teams and score */}
                <div className="flex items-center gap-3">
                  {/* Home */}
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className={`text-sm ${isFinished && homeScore! > awayScore! ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {home?.name ?? 'TBD'}
                    </span>
                    {home?.image_path && (
                      <Image src={home.image_path} alt={home.name} width={24} height={24} className="object-contain" />
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                    {isFinished || isLive ? (
                      <>
                        <span className="text-lg font-medium text-gray-900">{homeScore}</span>
                        <span className="text-gray-300">–</span>
                        <span className="text-lg font-medium text-gray-900">{awayScore}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">vs</span>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-2 flex-1">
                    {away?.image_path && (
                      <Image src={away.image_path} alt={away.name} width={24} height={24} className="object-contain" />
                    )}
                    <span className={`text-sm ${isFinished && awayScore! > homeScore! ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {away?.name ?? 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}