'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'

type PlayerWithContestants = Prisma.SurvivorPlayerGetPayload<{
  include: {
    contestants: {
      include: {
        survivorSeason: true
        tribeMemberships: {
          where: { isCurrent: true }
          include: { tribe: true }
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
  players: PlayerWithContestants[]
  seasons: Season[]
}

export default function PlayerBrowser({ players, seasons }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL')

  const filtered = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesSeason = seasonFilter === 'ALL' ||
        p.contestants.some(c => c.survivorSeason.id === seasonFilter)

      return matchesSearch && matchesSeason
    })
  }, [players, search, seasonFilter])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Survivor Players</h1>
        <p className="text-sm text-gray-400 mt-1">{players.length} players</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 w-56"
        />
        <select
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 text-gray-600"
        >
          <option value="ALL">All seasons</option>
          {seasons.map(s => (
            <option key={s.id} value={s.id}>
              Season {s.number} — {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No players found.</p>
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(player => {
          // Most recent contestant for photo and season info
          const mostRecent = player.contestants[0]
          const tribe = mostRecent?.tribeMemberships[0]?.tribe

          return (
            <button
              key={player.id}
              onClick={() => router.push(`/survivor/players/${player.id}`)}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all text-left"
            >
              {/* Photo */}
              <div className="relative h-40 bg-gray-100">
                {mostRecent?.imageUrl ? (
                  <Image
                    src={mostRecent.imageUrl}
                    alt={player.name}
                    fill
                    className="object-cover object-[center_top]"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: tribe?.color ?? '#e5e7eb' }}
                  >
                    <span className="text-4xl font-medium text-white/60">
                      {player.name[0]}
                    </span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                {/* Season count badge */}
                {player.contestants.length > 1 && (
                  <div className="absolute top-2 right-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white font-medium">
                      {player.contestants.length}x
                    </span>
                  </div>
                )}

                {/* Tribe badge */}
                {tribe && (
                  <div className="absolute bottom-2 left-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: tribe.color }}
                    >
                      {tribe.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {player.name}
                </p>
                {mostRecent?.occupation && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {mostRecent.occupation}
                  </p>
                )}
                {/* Season badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {player.contestants.map(c => (
                    <span
                      key={c.id}
                      className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                    >
                      S{c.survivorSeason.number}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}