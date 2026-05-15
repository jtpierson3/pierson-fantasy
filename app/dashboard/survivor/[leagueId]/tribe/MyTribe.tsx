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
      }
    }
  }
}>

type Season = {
  id: string
  number: number
  title: string
}

type Props = {
  leagueId: string
  tribe: TribeWithPlayers
  season: Season
  airedEpisodeIds: Set<string>
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

export default function MyTribe({ leagueId, tribe, season, airedEpisodeIds }: Props) {
  const router = useRouter()
  const [tribeName, setTribeName] = useState(tribe.name)
  const [isEditing, setIsEditing] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const hasPicks = tribe.players.length > 0

  const totalPoints = tribe.players.reduce((total, pick) => {
    return total + pick.contestant.episodeStats
      .filter(s => airedEpisodeIds.has(s.episode.id))
      .reduce((sum, s) => sum + s.event.points, 0)
  }, 0)

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
    <div className="p-6 max-w-2xl mx-auto">
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

      {/* Tribe name */}
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            {tribe.players.map(pick => {
              const contestant = pick.contestant
              const points = contestant.episodeStats
                .filter(s => airedEpisodeIds.has(s.episode.id))
                .reduce((sum, s) => sum + s.event.points, 0)
              const currentTribe = contestant.tribeMemberships[0]?.tribe
              const isEliminated = contestant.status === 'eliminated'
              const statusStyle = STATUS_STYLES[contestant.status] ?? 'border-gray-200'
              const statusBadge = STATUS_BADGE[contestant.status]

              return (
                <div
                  key={pick.id}
                  className={`bg-white border-2 rounded-xl p-4 flex flex-col items-center gap-2 ${statusStyle}`}
                >
                  {/* Photo */}
                  <div className="relative w-20 h-20 rounded-full overflow-hidden">
                    {contestant.imageUrl ? (
                      <Image
                        src={contestant.imageUrl}
                        alt={contestant.survivorPlayer.name}
                        fill
                        className={`object-cover ${isEliminated ? 'grayscale' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl text-gray-400">
                          {contestant.survivorPlayer.name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className={`text-sm font-medium text-center leading-tight ${
                    isEliminated ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {contestant.survivorPlayer.name}
                  </p>

                  {/* Tribe */}
                  {currentTribe && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentTribe.color }}
                      />
                      <p className="text-xs text-gray-400">{currentTribe.name}</p>
                    </div>
                  )}

                  {/* Status badge */}
                  {statusBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  )}

                  {/* Points */}
                  <span className={`text-sm font-medium ${
                    isEliminated ? 'text-gray-400' : 'text-green-700'
                  }`}>
                    {points} pts
                  </span>
                </div>
              )
            })}
          </div>

          {/* Edit picks button */}
          <button
            onClick={() => router.push(`/dashboard/survivor/${leagueId}/tribe/pick`)}
            className="w-full py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Edit Picks
          </button>
        </>
      )}
    </div>
  )
}