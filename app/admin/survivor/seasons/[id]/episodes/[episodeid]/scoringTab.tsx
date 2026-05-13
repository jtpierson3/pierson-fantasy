'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Contestant = {
  id: string
  status: string
  survivorPlayer: { id: string; name: string; imageUrl: string | null }
  tribeMemberships: { tribe: { name: string; color: string } }[]
}

type ScoringEvent = {
  id: string
  label: string
  points: number
  category: string
}

type EpisodeStat = {
  id: string
  contestantId: string
  eventId: string
  order: number
  description: string | null
  contestant: { survivorPlayer: { name: string } }
  event: ScoringEvent
}

type Episode = {
  id: string
  stats: EpisodeStat[]
}

type Props = {
  episode: Episode
  contestants: Contestant[]
  scoringEvents: ScoringEvent[]
}

const CATEGORY_STYLES: Record<string, string> = {
  challenge: 'bg-blue-900 text-blue-400 border-blue-700',
  tribal: 'bg-red-900 text-red-400 border-red-700',
  social: 'bg-purple-900 text-purple-400 border-purple-700',
  milestone: 'bg-yellow-900 text-yellow-400 border-yellow-700',
  other: 'bg-gray-800 text-gray-400 border-gray-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  challenge: 'Challenge',
  tribal: 'Tribal Council',
  social: 'Social',
  milestone: 'Milestone',
  other: 'Other',
}

export default function ScoringTab({ episode, contestants, scoringEvents }: Props) {
  const router = useRouter()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedContestantIds, setSelectedContestantIds] = useState<Set<string>>(new Set())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selectedEvent = scoringEvents.find(e => e.id === selectedEventId)

  // Group scoring events by category
  const groupedEvents = useMemo(() => {
    return Object.entries(
      scoringEvents.reduce((acc, event) => {
        if (!acc[event.category]) acc[event.category] = []
        acc[event.category].push(event)
        return acc
      }, {} as Record<string, ScoringEvent[]>)
    )
  }, [scoringEvents])

  // Group existing stats by event
  const statsByEvent = useMemo(() => {
    return episode.stats.reduce((acc, stat) => {
      if (!acc[stat.eventId]) acc[stat.eventId] = []
      acc[stat.eventId].push(stat)
      return acc
    }, {} as Record<string, EpisodeStat[]>)
  }, [episode.stats])

  const toggleContestant = useCallback((id: string) => {
    setSelectedContestantIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
    setSelectedContestantIds(new Set())
    setDescription('')
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedEventId || selectedContestantIds.size === 0) {
      setError('Select an event and at least one contestant')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/survivor/stats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          eventId: selectedEventId,
          contestantIds: Array.from(selectedContestantIds),
          description: description || null,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')

      setSelectedEventId(null)
      setSelectedContestantIds(new Set())
      setDescription('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [selectedEventId, selectedContestantIds, description, episode.id, router])

  const handleDeleteStat = useCallback(async (statId: string) => {
    setDeletingId(statId)
    try {
      const res = await fetch('/api/admin/survivor/stats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statId })
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
    } catch {
      // handle error
    } finally {
      setDeletingId(null)
    }
  }, [router])

  return (
    <div className="flex gap-6">
      {/* Left — Event selector */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-medium text-white">Scoring Events</p>
            <p className="text-xs text-gray-400 mt-0.5">Select an event to assign</p>
          </div>

          {scoringEvents.length === 0 && (
            <p className="text-sm text-gray-500 p-4">
              No scoring events defined for this season.
            </p>
          )}

          <div className="divide-y divide-gray-800">
            {groupedEvents.map(([category, events]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-gray-800/50">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_STYLES[category]}`}>
                    {CATEGORY_LABELS[category]}
                  </span>
                </div>
                {events.map(event => {
                  const statsCount = statsByEvent[event.id]?.length ?? 0
                  return (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        selectedEventId === event.id
                          ? 'bg-green-900/40 border-l-2 border-green-500'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <span className="text-sm text-gray-300 truncate flex-1">{event.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {statsCount > 0 && (
                          <span className="text-xs text-gray-500">{statsCount}×</span>
                        )}
                        <span className={`text-xs font-medium ${event.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {event.points >= 0 ? '+' : ''}{event.points}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Contestant picker + existing stats */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Contestant picker */}
        {selectedEvent ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{selectedEvent.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select contestant(s) who earned this
                </p>
              </div>
              <span className={`text-sm font-bold ${selectedEvent.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedEvent.points >= 0 ? '+' : ''}{selectedEvent.points} pts each
              </span>
            </div>

            {/* Contestants grid */}
            <div className="p-4 grid grid-cols-3 gap-2">
              {contestants.map(contestant => {
                const isSelected = selectedContestantIds.has(contestant.id)
                const currentTribe = contestant.tribeMemberships[0]?.tribe
                const isEliminated = contestant.status === 'eliminated'

                return (
                  <button
                    key={contestant.id}
                    onClick={() => toggleContestant(contestant.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'bg-green-900/40 border-green-600'
                        : isEliminated
                        ? 'bg-gray-800/30 border-gray-800 opacity-50'
                        : 'bg-gray-800/30 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    {/* Image */}
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {contestant.survivorPlayer.imageUrl ? (
                        <Image
                          src={contestant.survivorPlayer.imageUrl}
                          alt={contestant.survivorPlayer.name}
                          fill
                          className="object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-xs text-gray-400">
                            {contestant.survivorPlayer.name[0]}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 rounded-full bg-green-500/30 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {contestant.survivorPlayer.name.split(' ')[0]}
                      </p>
                      {currentTribe && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: currentTribe.color }}
                          />
                          <p className="text-xs text-gray-500 truncate">{currentTribe.name}</p>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Description + Save */}
            <div className="px-4 pb-4 flex flex-col gap-3">
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description (e.g. played on self)"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {selectedContestantIds.size} contestant{selectedContestantIds.size !== 1 ? 's' : ''} selected
                  {selectedContestantIds.size > 0 && (
                    <span className="text-green-400 ml-1">
                      ({selectedContestantIds.size * selectedEvent.points >= 0 ? '+' : ''}{selectedContestantIds.size * selectedEvent.points} pts total)
                    </span>
                  )}
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving || selectedContestantIds.size === 0}
                  className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">Select a scoring event from the left to assign points</p>
          </div>
        )}

        {/* Existing stats */}
        {episode.stats.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-white">
                Recorded Stats ({episode.stats.length})
              </p>
            </div>
            <div className="divide-y divide-gray-800">
              {episode.stats.map((stat: EpisodeStat) => (
                <div
                  key={stat.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {stat.contestant.survivorPlayer.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{stat.event.label}</p>
                    {stat.description && (
                      <p className="text-xs text-gray-500 italic">{stat.description}</p>
                    )}
                  </div>
                  <span className={`text-sm font-medium flex-shrink-0 ${
                    stat.event.points >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.event.points >= 0 ? '+' : ''}{stat.event.points}
                  </span>
                  <button
                    onClick={() => handleDeleteStat(stat.id)}
                    disabled={deletingId === stat.id}
                    className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors disabled:opacity-50"
                  >
                    {deletingId === stat.id ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}