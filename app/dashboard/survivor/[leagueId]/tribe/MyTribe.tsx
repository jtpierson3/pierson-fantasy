'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'

type TribeWithPlayers = Prisma.SurvivorFantasyLeagueTribeGetPayload<{
  include: {
    players: {
      include: {
        contestant: {
          include: {
            survivorPlayer: true
            tribeMemberships: {
              where: { isCurrent: true }
              include: { tribe: true }
            }
            episodeStats: {
              include: { event: true; episode: true }
            }
          }
        }
        swappedFrom: {
            include: {
                survivorPlayer: true
                tribeMemberships: {
                    include: {
                        tribe: true
                    }
                }
                episodeStats: {
                    include: { event: true; episode: true}
                }
            }
        }
      }
    }
  }
}>

type ActiveContestant = Prisma.ContestantGetPayload<{
    include: {
        survivorPlayer: true
        tribeMemberships: { include: { tribe: true } }
    }
}>

type Season = {
  id: string
  number: number
  title: string
}

type MergeEpisode = {
    id: string
    number: number
} | null

type EliminationPick = Prisma.EliminationPickGetPayload<{
  include: {
    contestant: { include: { survivorPlayer: true } }
    episode: true
  }
}>

type Episode = {
  id: string
  number: number
  name: string
  isAired: boolean
  isFinale: boolean
}

type Props = {
  leagueId: string
  tribe: TribeWithPlayers
  season: Season
  airedEpisodeIds: Set<string>
  swapWindowOpen: boolean
  activeContestants: ActiveContestant[]
  mergeEpisode: MergeEpisode
  eliminationPicks: EliminationPick[]
  eliminationPickPoints: number
  episodes: Episode[]
}

const STATUS_STYLES: Record<string, string> = {
  active: 'border-green-200',
  eliminated: 'border-gray-200',
  jury: 'border-blue-300',
  finalist: 'border-purple-300',
  winner: 'border-yellow-400',
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  eliminated: { label: 'Eliminated', color: 'bg-gray-100 text-gray-500' },
  jury: { label: 'Jury', color: 'bg-blue-100 text-blue-600' },
  finalist: { label: 'Finalist', color: 'bg-purple-100 text-purple-600' },
  winner: { label: 'Winner', color: 'bg-yellow-100 text-yellow-600' },
}

export default function MyTribe({ 
    leagueId, tribe, season, airedEpisodeIds, swapWindowOpen, activeContestants, mergeEpisode, eliminationPicks, eliminationPickPoints, episodes
}: Props) {
  const router = useRouter()
  const [tribeName, setTribeName] = useState(tribe.name)
  const [isEditing, setIsEditing] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  //Swap state
  const [showSwap, setShowSwap] = useState(false)
  const [swapOutId, setSwapOutId] = useState<string>('')
  const [swapInId, setSwapInId] = useState<string>('')
  const [savingSwap, setSavingSwap] = useState(false)
  const [swapError, setSwapError] = useState<string | null>(null) 

  const hasPicks = tribe.players.length > 0

  const totalPoints = tribe.players.reduce((total, pick) => {
    const mergeEpisodeNumber = mergeEpisode?.number ?? 0

    if (pick.isSwap) {
        //New player - only counts after merge Episode
        const newPoints = pick.contestant.episodeStats
            .filter(s => airedEpisodeIds.has(s.episode.id) && s.episode.number > mergeEpisodeNumber)
            .reduce((sum, s) => sum + s.event.points, 0)

        //Old player = only count stats up to and including merge episode
        const oldPoints = (pick.swappedFrom?.episodeStats ?? [])
            .filter(s => airedEpisodeIds.has(s.episode.id) && s.episode.number <= mergeEpisodeNumber)
            .reduce((sum, s) => sum + s.event.points, 0)

        return total + newPoints + oldPoints
    }

    return total + pick.contestant.episodeStats
        .filter(s => airedEpisodeIds.has(s.episode.id))
        .reduce((sum, s) => sum + s.event.points, 0)
  }, 0)

  const handleSaveSwap = useCallback(async () => {
    if (!swapOutId || !swapInId) {
        setSwapError('Please select both a player to swap out and a player to swap in.')
        return
    }
    setSavingSwap(true)
    setSwapError(null)
    try {
        const res = await fetch('/api/survivor/tribe/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tribeId: tribe.id,
                swapOutId,
                swapInId,
            })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to save swap')
        setShowSwap(false)
        setSwapOutId('')
        setSwapInId('')
        router.refresh()
    } catch (err) {
        setSwapError(err instanceof Error ? err.message : 'Failed to save swap')
    } finally {
        setSavingSwap(false)
    }
  }, [swapOutId, swapInId, tribe.id, router])

  const handleSaveName = useCallback(async () => {
    if (!tribeName.trim()) {
      setNameError('Tribe name cannot be empty')
      return
    }
    setSavingName(true)
    setNameError(null)
    try {
      const res = await fetch('/api/survivor/tribe/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribeId: tribe.id,
          name: tribeName.trim(),
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to rename tribe')
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to rename tribe')
    } finally {
      setSavingName(false)
    }
  }, [tribeName, tribe.id, router])

  return (
    <div className="p-6 mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/survivor" className="hover:text-gray-600 transition-colors">
          Survivor
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/survivor/${leagueId}`}
          className="hover:text-gray-600 transition-colors"
        >
          League
        </Link>
        <span>/</span>
        <span className="text-gray-900">My Tribe</span>
      </div>

      <div className="flex gap-6">
        {/* Left 1/3 flex-shrink-0 */}
        <div className="w-1/3 flex-shrink-0">
          <div className= "bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <div>Episode</div>
              <div className="text-right">Points</div>
            </div>

            {/* Episode Rows */}
            <div className="divide-y divide-gray-50">
              {episodes.map(episode => {
                const isAired = airedEpisodeIds.has(episode.id)
                const pick = eliminationPicks.find(p => p.episodeId === episode.id)

                // Calculate Tribe Points for this episode
                const episodePoints = (tribe.players ?? []).reduce((total, p) => {
                  const mergeEpisodeNumber = mergeEpisode?.number ?? 0
                  if (p.isSwap) {
                    if (episode.number > mergeEpisodeNumber) {
                      return total + p.contestant.episodeStats
                        .filter(s => s.episode.id === episode.id)
                        .reduce((sum, s) => sum + s.event.points, 0)
                    }
                    return total + (p.swappedFrom?.episodeStats ?? [])
                      .filter(s => s.episode.id === episode.id)
                      .reduce((sum, s) => sum + s.event.points, 0)
                  }
                  return total + p.contestant.episodeStats
                    .filter(s => s.episode.id === episode.id)
                    .reduce((sum, s) => sum + s.event.points, 0)
                }, 0)

                const pickPoints = pick?.isCorrect ? eliminationPickPoints : 0
                const totalEpisodePoints = episodePoints + pickPoints

                return (
                  <div
                    key={episode.id}
                    className={`px-3 py-2.5 ${!isAired ? 'opacity-40' : ''}`}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Link
                          href={`/survivor/seasons/${season.id}/episodes/${episode.id}`}
                          className="text-xs font-medium text-gray-900 hover:text-green-700 transition-colors"
                        >
                          Ep {episode.number} - {episode.name}
                        </Link>
                        {isAired && pick && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Voted: {pick.contestant.survivorPlayer.name.split(' ')[0]}
                            {' '}
                            {pick.isCorrect && (
                              <span className="text-green-600">
                                +{eliminationPickPoints}
                              </span>
                            )}
                          </p>
                        )}
                        {isAired && !pick && (
                          <p className="text-xs text-gray-400 mt-0.5">No pick</p>
                        )}
                      </div>
                      <div className="text-right">
                        {isAired && (
                          <p className={`text-xs font-medium ${
                            totalEpisodePoints > 0 ? 'text-green-700' : 'text-gray-400'
                          }`}>
                            {totalEpisodePoints > 0 ? `+${totalEpisodePoints}` : totalEpisodePoints}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 gap-2 px-3 py-2.5 bg-gray-50 border-t border-gray-100">
              <div>
                <p className="text-xs font-medium text-gray-900">Total</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {eliminationPicks.filter(p => p.isCorrect).length} of {eliminationPicks.length} correct picks
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-700">
                  {totalPoints + (eliminationPicks.filter(p => p.isCorrect).length * eliminationPickPoints)} pts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tribe name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={tribeName}
                  onChange={e => setTribeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                  className="text-xl font-medium text-gray-900 border-b-2 border-green-600 focus:outline-none bg-transparent flex-1"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-3 py-1 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setTribeName(tribe.name)
                    setNameError(null)
                  }}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-medium text-gray-900">{tribeName}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Rename tribe"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          {nameError && (
            <p className="text-xs text-red-500 mb-3">{nameError}</p>
          )}

          <p className="text-sm text-gray-400 mb-6">
            Season {season.number} · {season.title}
            {hasPicks && ` · ${totalPoints} pts`}
          </p>

          {/* No picks state */}
          {!hasPicks ? (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center mb-6">
              <p className="text-sm text-gray-400 mb-4">
                You haven&apos;t picked your tribe yet
              </p>
              <button
                onClick={() => router.push(`/dashboard/survivor/${leagueId}/tribe/pick`)}
                className="px-6 py-2.5 text-sm rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors font-medium"
              >
                Pick your tribe
              </button>
            </div>
          ) : (
            <>
              {/* 2x3 grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                {tribe.players.map(pick => {
                    const contestant = pick.contestant
                    const mergeEpisodeNumber = mergeEpisode?.number ?? 0

                    const points = pick.isSwap
                    ? pick.contestant.episodeStats
                        .filter(s => airedEpisodeIds.has(s.episode.id) && s.episode.number > mergeEpisodeNumber)
                        .reduce((sum, s) => sum + s.event.points, 0)
                    : contestant.episodeStats
                        .filter(s => airedEpisodeIds.has(s.episode.id))
                        .reduce((sum, s) => sum + s.event.points, 0)

                    const currentTribe = contestant.tribeMemberships[0]?.tribe
                    const isEliminated = contestant.status === 'eliminated'
                    const statusStyle = STATUS_STYLES[contestant.status] ?? 'border-gray-200'
                    const statusBadge = STATUS_BADGE[contestant.status]

                    return (
                    <div key={pick.id} className="flex flex-col gap-2">
                        {/* Current player card */}
                        <div className={`bg-white border-2 rounded-xl p-4 flex flex-col items-center gap-2 ${statusStyle}`}>
                        {/* Swap badge */}
                        {pick.isSwap && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium w-full text-center">
                            🔄 Merge swap
                            </span>
                        )}

                        {/* Photo */}
                        <div className="relative w-20 h-20 rounded-full overflow-hidden">
                            {contestant.imageUrl ? (
                            <Image
                                src={contestant.imageUrl}
                                alt={contestant.survivorPlayer.name}
                                fill
                                className={`object-cover object-[center_top] ${isEliminated ? 'grayscale' : ''}`}
                            />
                            ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <span className="text-2xl text-gray-400">
                                {contestant.survivorPlayer.name[0]}
                                </span>
                            </div>
                            )}
                        </div>

                        <p className={`text-sm font-medium text-center leading-tight ${
                            isEliminated ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                            {contestant.survivorPlayer.name}
                        </p>

                        {currentTribe && (
                            <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTribe.color }} />
                            <p className="text-xs text-gray-400">{currentTribe.name}</p>
                            </div>
                        )}

                        {statusBadge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                            </span>
                        )}

                        <span className={`text-sm font-medium ${isEliminated ? 'text-gray-400' : 'text-green-700'}`}>
                            {points} pts
                        </span>
                        </div>

                        {/* Swapped out player */}
                        {pick.isSwap && pick.swappedFrom && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 opacity-60">
                            <span className="text-xs text-gray-400 font-medium">Replaced</span>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            {pick.swappedFrom.imageUrl ? (
                                <Image
                                src={pick.swappedFrom.imageUrl}
                                alt={pick.swappedFrom.survivorPlayer.name}
                                fill
                                className="object-cover object-[center_top] grayscale"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <span className="text-sm text-gray-400">
                                    {pick.swappedFrom.survivorPlayer.name[0]}
                                </span>
                                </div>
                            )}
                            </div>
                            <p className="text-xs text-gray-400 text-center leading-tight">
                            {pick.swappedFrom.survivorPlayer.name}
                            </p>
                            <span className="text-xs text-gray-400">
                            {pick.swappedFrom.episodeStats
                                .filter(s => airedEpisodeIds.has(s.episode.id) && s.episode.number <= (mergeEpisode?.number ?? 0))
                                .reduce((sum, s) => sum + s.event.points, 0)} pts
                            </span>
                        </div>
                        )}
                    </div>
                    )
                })}
                </div>

                {/* Swap window banner */}
                {swapWindowOpen && !showSwap && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                      <div>
                          {tribe.hasUsedMergeSwap ? (
                              <>
                                  <p className="text-sm font-medium text-blue-900">Merge Swap Used</p>
                                  <p className="text-xs text-blue-600 mt-0.5">
                                      You can edit your swap until the next episode airs.
                                  </p>
                              </>
                          ) : (
                              <>
                                  <p className="text-sm font-medium text-blue-900">Merge swap available!</p>
                                  <p className="text-xs text-blue-600 mt-0.5">
                                      You can swap one player before the next episode airs.
                                  </p>
                              </>
                          )}                 
                      </div>
                      <button
                          onClick={async () => {
                              if (tribe.hasUsedMergeSwap) {
                                  const res = await fetch('/api/survivor/tribe/swap/reset', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tribeId: tribe.id })
                                  })
                                  if (res.ok) {
                                      router.refresh()
                                  }
                              } else {
                                  setShowSwap(true)
                              }
                          }}
                          className="px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors font-medium"
                      >
                          {tribe.hasUsedMergeSwap ? 'Edit Swap' : 'Use Swap'}
                      </button>
                      </div>
                  </div>
                )}

                {/* Swap UI */}
                {showSwap && (
                <div className="bg-white border border-blue-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900">🔄 Merge Swap</h3>
                    <button
                        onClick={() => {
                        setShowSwap(false)
                        setSwapOutId('')
                        setSwapInId('')
                        setSwapError(null)
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                    >
                        Cancel
                    </button>
                    </div>

                    <div className="flex flex-col gap-3">
                    {/* Swap out */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Remove from tribe
                        </label>
                        <select
                        value={swapOutId}
                        onChange={e => setSwapOutId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                        >
                        <option value="">Select a player to remove...</option>
                        {tribe.players
                            .filter(pick => !pick.isSwap)
                            .map(pick => (
                            <option key={pick.id} value={pick.contestant.id}>
                            {pick.contestant.survivorPlayer.name}
                            {pick.contestant.status !== 'active' ? ` (${pick.contestant.status})` : ''}
                            </option>
                        ))}
                        </select>
                    </div>

                    {/* Swap in */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Add to tribe
                        </label>
                        <select
                        value={swapInId}
                        onChange={e => setSwapInId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                        >
                        <option value="">Select a player to add...</option>
                        {activeContestants
                            .filter(c => !tribe.players.some(p => p.contestantId === c.id))
                            .map(c => {
                            const tribe2 = c.tribeMemberships[c.tribeMemberships.length - 1]?.tribe
                            return (
                                <option key={c.id} value={c.id}>
                                {c.survivorPlayer.name}{tribe2 ? ` (${tribe2.name})` : ''}
                                </option>
                            )
                            })}
                        </select>
                    </div>

                    {swapError && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {swapError}
                        </p>
                    )}

                    <button
                        onClick={handleSaveSwap}
                        disabled={savingSwap || !swapOutId || !swapInId}
                        className="w-full py-2.5 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                    >
                        {savingSwap ? 'Saving...' : 'Confirm swap'}
                    </button>
                    </div>
                </div>
                )}

                {/* Edit picks button */}
                {airedEpisodeIds.size < 1 && (
                <button
                    onClick={() => router.push(`/dashboard/survivor/${leagueId}/tribe/pick`)}
                    className="w-full py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                    Edit Picks
                </button>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}