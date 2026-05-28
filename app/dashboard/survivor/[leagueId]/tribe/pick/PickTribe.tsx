'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import PlayerBioCard from '@/app/components/PlayerBioCard'

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    survivorSeason: true
    tribeMemberships: {
      where: { isCurrent: true }
      include: { tribe: true }
    }
    challengeResults: {
      where: { placement: 1 }
      include: { challenge: true }
    }
    votesReceived: {
      where: { isRevoked: false }
    }
    episodeStats: {
      include: { event: true }
    }
  }
}>

type Season = {
  id: string
  number: number
  title: string
  tribes: { id: string; name: string; color: string }[]
}

type Props = {
  leagueId: string
  tribeId: string
  contestants: ContestantWithDetails[]
  allContestants: ContestantWithDetails[]
  currentPickIds: string[]
  isLocked: boolean
  season: Season
}

export default function PickTribe({
  leagueId,
  tribeId,
  contestants,
  allContestants,
  currentPickIds,
  isLocked,
  season,
}: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentPickIds))
  const [selectedContestant, setSelectedContestant] = useState<ContestantWithDetails | null>(
    contestants.find(c => currentPickIds[0] === c.id) ?? contestants[0] ?? null
  )
  const [search, setSearch] = useState('')
  const [tribeFilter, setTribeFilter] = useState<string>('ALL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return contestants.filter(c => {
      const matchesSearch = c.survivorPlayer.name
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesTribe = tribeFilter === 'ALL' ||
        c.tribeMemberships[0]?.tribe.id === tribeFilter
      return matchesSearch && matchesTribe
    })
  }, [contestants, search, tribeFilter])

  const togglePick = useCallback((contestant: ContestantWithDetails) => {
    if (isLocked) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(contestant.id)) {
        next.delete(contestant.id)
      } else {
        if (next.size >= 6) return prev
        next.add(contestant.id)
      }
      return next
    })
  }, [isLocked])

  const handleSave = useCallback(async () => {
    if (selectedIds.size !== 6) {
      setError('You must pick exactly 6 contestants')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/survivor/tribe/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribeId,
          contestantIds: Array.from(selectedIds),
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save picks')
      router.push(`/dashboard/survivor/${leagueId}/tribe`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save picks')
    } finally {
      setSaving(false)
    }
  }, [selectedIds, tribeId, leagueId, router])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        <Link
          href={`/dashboard/survivor/${leagueId}`}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to league
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-medium text-gray-900">Pick Your Tribe</h1>
          <p className="text-xs text-gray-400">
            Season {season.number} · {season.title}
          </p>
        </div>
        <div className="w-32" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Contestant list */}
        <div className="w-2/5 border-r border-gray-100 flex flex-col bg-white">
          {/* Search and filter */}
          <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Search contestants..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setTribeFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  tribeFilter === 'ALL'
                    ? 'bg-green-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {season.tribes.map(tribe => (
                <button
                  key={tribe.id}
                  onClick={() => setTribeFilter(tribe.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                    tribeFilter === tribe.id ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  style={tribeFilter === tribe.id ? { backgroundColor: tribe.color } : {}}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tribeFilter === tribe.id ? 'white' : tribe.color }}
                  />
                  {tribe.name}
                </button>
              ))}
            </div>
          </div>

          {/* Contestant list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(contestant => {
              const isPicked = selectedIds.has(contestant.id)
              const isSelected = selectedContestant?.id === contestant.id
              const tribe = contestant.tribeMemberships[0]?.tribe

              return (
                <button
                  key={contestant.id}
                  onClick={() => setSelectedContestant(contestant)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors ${
                    isSelected
                      ? isPicked ? 'bg-green-50' : 'bg-gray-50'
                      : isPicked ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    {contestant.imageUrl ? (
                      <img
                        src={contestant.imageUrl}
                        alt={contestant.survivorPlayer.name}
                        className="w-10 h-10 object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm text-gray-500">
                          {contestant.survivorPlayer.name[0]}
                        </span>
                      </div>
                    )}
                    {isPicked && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isPicked ? 'text-green-800' : 'text-gray-900'}`}>
                      {contestant.survivorPlayer.name}
                    </p>
                    {tribe && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tribe.color }}
                        />
                        <p className="text-xs text-gray-400 truncate">{tribe.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Pick Button */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      togglePick(contestant)
                    }}
                    disabled={!isPicked && selectedIds.size >= 6}
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isPicked
                        ? 'bg-green-500 text-white hover:bg-red-400'
                        : selectedIds.size >= 6
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                    }`}
                  >
                    {isPicked ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right — Player bio */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
          {selectedContestant ? (
            <div className="p-6">
              <PlayerBioCard
                player={selectedContestant.survivorPlayer}
                contestants={allContestants.filter(
                  c => c.survivorPlayerId === selectedContestant.survivorPlayerId
                )}
                featuredContestantId={selectedContestant.id}
              />

              {/* Select button */}
              {!isLocked && (
                <div className="mt-4">
                  <button
                    onClick={() => togglePick(selectedContestant)}
                    disabled={!selectedIds.has(selectedContestant.id) && selectedIds.size >= 6}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                      selectedIds.has(selectedContestant.id)
                        ? 'bg-green-800 text-white hover:bg-green-700'
                        : selectedIds.size >= 6
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {selectedIds.has(selectedContestant.id)
                      ? '✓ Remove from tribe'
                      : selectedIds.size >= 6
                      ? 'Tribe is full'
                      : 'Add to tribe'
                    }
                  </button>
                </div>
              )}

              {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mt-4">
                  <p className="text-sm text-amber-700 font-medium">
                    Picks are locked — the season has started
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a contestant to view their info</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < selectedIds.size ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {selectedIds.size}/6 picked
          </span>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {!isLocked && (
            <button
              onClick={handleSave}
              disabled={saving || selectedIds.size !== 6}
              className="px-6 py-2 text-sm rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Tribe'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}