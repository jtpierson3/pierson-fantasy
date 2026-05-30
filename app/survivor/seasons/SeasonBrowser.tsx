'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Tribe = {
  id: string
  name: string
  color: string
}

type Season = {
  id: string
  number: number
  title: string
  theme: string | null
  location: string | null
  imageUrl: string | null
  airDate: Date | null
  finaleDate: Date | null
  isActive: boolean
  castawayCount: number | null
  contestants: { id: string }[]
  episodes: { id: string }[]
  tribes: Tribe[]
}

type Props = {
  seasons: Season[]
}

export default function SeasonBrowser({ seasons }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const filtered = useMemo(() => {
    return seasons.filter(s => {
      const matchesSearch =
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.theme?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (s.location?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        s.number.toString().includes(search)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && s.isActive) ||
        (filter === 'completed' && !s.isActive)

      return matchesSearch && matchesFilter
    })
  }, [seasons, search, filter])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Survivor Seasons</h1>
        <p className="text-sm text-gray-400 mt-1">{seasons.length} seasons</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search seasons..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 w-56"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No seasons found matching your search.</p>
        </div>
      )}

      {/* Season grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(season => (
          <button
            key={season.id}
            onClick={() => router.push(`/survivor/seasons/${season.id}`)}
            className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all text-left"
          >
            {/* Season image */}
            <div className="relative h-36 bg-gray-100">
              {season.imageUrl ? (
                <Image
                  src={season.imageUrl}
                  alt={season.title}
                  fill
                  className="object-cover object-[center_top]"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center">
                  <p className="text-white/40 text-4xl font-bold">
                    {season.number}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Season number */}
              <div className="absolute bottom-2 left-3">
                <p className="text-white/70 text-xs">Season {season.number}</p>
              </div>

              {/* Active badge */}
              {season.isActive && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/90 text-white font-medium">
                    Live
                  </span>
                </div>
              )}
            </div>

            {/* Season info */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {season.title}
              </p>
              {season.theme && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {season.theme}
                </p>
              )}
              {season.location && (
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {season.location}
                </p>
              )}

              {/* Stats row */}
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-gray-400">
                  {season.contestants.length} castaways
                </span>
                <span className="text-xs text-gray-400">
                  {season.episodes.length} episodes
                </span>
              </div>

              {/* Tribe colors */}
              {season.tribes.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {season.tribes.map(tribe => (
                    <div
                      key={tribe.id}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tribe.color }}
                      title={tribe.name}
                    />
                  ))}
                </div>
              )}

              {/* Air date */}
              {season.airDate && (
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(season.airDate).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}