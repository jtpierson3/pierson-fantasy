'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'

type LeagueWithSchedule = Prisma.FantasyLeagueGetPayload<{
  include: {
    gameweeks: {
      include: {
        matchups: {
          include: {
            homeTeam: { include: { user: true } }
            awayTeam: { include: { user: true } }
          }
        }
      }
    }
  }
}>

type Props = {
  league: LeagueWithSchedule
}

export default function MatchupManager({ league }: Props) {
  const router = useRouter()
  const [selectedWeek, setSelectedWeek] = useState<number>(
    league.gameweeks.find(gw => gw.isCurrent)?.gameweekNumber ?? 1
  )
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentGameweek = useMemo(
    () => league.gameweeks.find(gw => gw.gameweekNumber === selectedWeek),
    [league.gameweeks, selectedWeek]
  )

  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)

  const handleFinalizeWeek = useCallback(async () => {
    if (!currentGameweek) return
    const confirmed = window.confirm(
        `Finalize Gameweek ${currentGameweek.gameweekNumber}? This will update standings and cannot be undone from here.`
    )
    if (!confirmed) return

    setFinalizing(true)
    setFinalizeError(null)
    try {
        const res = await fetch('/api/admin/league/matchups/finalize-week', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameweekId: currentGameweek.id })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to finalize week')
        router.refresh()
    } catch (err) {
        setFinalizeError(err instanceof Error ? err.message : 'Failed to finalize week')
    } finally {
        setFinalizing(false)
    }
  }, [currentGameweek, router])

  const getScoreInput = useCallback((matchupId: string, field: 'home' | 'away', fallback: number) => {
    return scores[matchupId]?.[field] ?? fallback.toString()
  }, [scores])

  const handleScoreChange = useCallback((matchupId: string, field: 'home' | 'away', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchupId]: {
        home: prev[matchupId]?.home ?? '0',
        away: prev[matchupId]?.away ?? '0',
        [field]: value,
      }
    }))
  }, [])

  const handleSaveScore = useCallback(async (matchupId: string) => {
    const entry = scores[matchupId]
    if (!entry) return

    setSaving(matchupId)
    setError(null)
    try {
      const res = await fetch('/api/admin/league/matchups/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchupId,
          homePoints: parseFloat(entry.home),
          awayPoints: parseFloat(entry.away),
        })
      })
      if (!res.ok) throw new Error('Failed to save score')
      router.refresh()
    } catch {
      setError('Failed to save score')
    } finally {
      setSaving(null)
    }
  }, [scores, router])

  const handleToggleComplete = useCallback(async (matchupId: string, isComplete: boolean) => {
    setSaving(matchupId)
    setError(null)
    try {
      const res = await fetch('/api/admin/league/matchups/toggle-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchupId, isComplete: !isComplete })
      })
      if (!res.ok) throw new Error('Failed to update')
      router.refresh()
    } catch {
      setError('Failed to update completion status')
    } finally {
      setSaving(null)
    }
  }, [router])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/admin/league" className="hover:text-gray-600 transition-colors">
              League Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Matchups</span>
          </div>
          <h1 className="text-xl font-medium text-gray-900">{league.name} — Matchups</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Gameweek selector */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {league.gameweeks.map(gw => (
          <button
            key={gw.id}
            onClick={() => setSelectedWeek(gw.gameweekNumber)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
              selectedWeek === gw.gameweekNumber
                ? 'bg-green-800 text-white'
                : gw.isComplete
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            GW{gw.gameweekNumber}
          </button>
        ))}
      </div>

      {/* Matchups for selected week */}
      {currentGameweek && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-gray-900">
              Gameweek {currentGameweek.gameweekNumber}
            </h2>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    currentGameweek.isComplete
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                    {currentGameweek.isComplete ? 'Complete' : 'In Progress'}
                    </span>
                    <button
                        onClick={handleFinalizeWeek}
                        disabled={currentGameweek.isComplete || finalizing}
                        className="px-3 py-1.5 text-xs rounded-lg bg-purple-700 text-white hover:bg-purple-600 transition-colors disabled:opacity-50 font-medium"
                    >
                        {finalizing ? 'Finalizing...' : currentGameweek.isComplete ? 'Finalized' : 'Finalize Week'}
                    </button>
                </div>
          </div>

          {finalizeError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {finalizeError}
            </p>
          )}

          {currentGameweek.matchups.length === 0 && (
            <p className="text-sm text-gray-400">No matchups this week.</p>
          )}

          {currentGameweek.matchups.map(matchup => (
            <div
              key={matchup.id}
              className="bg-white border border-gray-100 rounded-xl p-4"
            >
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Home team */}
                <div className="col-span-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {matchup.homeTeam.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {matchup.homeTeam.user.username}
                  </p>
                </div>

                {/* Home score input */}
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={getScoreInput(matchup.id, 'home', matchup.homePoints)}
                    onChange={e => handleScoreChange(matchup.id, 'home', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-center text-gray-900"
                  />
                </div>

                <div className="col-span-2 text-center text-xs text-gray-300">vs</div>

                {/* Away score input */}
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={getScoreInput(matchup.id, 'away', matchup.awayPoints)}
                    onChange={e => handleScoreChange(matchup.id, 'away', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-center"
                  />
                </div>

                {/* Away team */}
                <div className="col-span-3 text-right">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {matchup.awayTeam.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {matchup.awayTeam.user.username}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleComplete(matchup.id, matchup.isComplete)}
                  disabled={saving === matchup.id}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
                    matchup.isComplete
                      ? 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  }`}
                >
                  {matchup.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button
                  onClick={() => handleSaveScore(matchup.id)}
                  disabled={saving === matchup.id || !scores[matchup.id]}
                  className="px-3 py-1.5 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {saving === matchup.id ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}