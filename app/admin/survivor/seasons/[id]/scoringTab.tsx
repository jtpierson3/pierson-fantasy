'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ScoringEvent = {
  id: string
  label: string
  points: number
  category: string
}

type Season = {
  id: string
  scoringEvents: ScoringEvent[]
}

type Props = {
  season: Season
}

type EventForm = {
  label: string
  points: string
  category: string
}

const emptyForm: EventForm = {
  label: '',
  points: '',
  category: 'challenge',
}

const CATEGORIES = [
  { value: 'challenge', label: 'Challenge' },
  { value: 'tribal', label: 'Tribal Council' },
  { value: 'social', label: 'Social' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_STYLES: Record<string, string> = {
  challenge: 'bg-blue-900 text-blue-400 border-blue-700',
  tribal: 'bg-red-900 text-red-400 border-red-700',
  social: 'bg-purple-900 text-purple-400 border-purple-700',
  milestone: 'bg-yellow-900 text-yellow-400 border-yellow-700',
  other: 'bg-gray-800 text-gray-400 border-gray-700',
}

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function ScoringTab({ season }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScoringEvent | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyFromSeasonId, setCopyFromSeasonId] = useState('')
  const [availableSeasons, setAvailableSeasons] = useState<{ id: string; number: number; title: string; scoringEvents: ScoringEvent[]}[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const handleOpenCopy = useCallback(async () => {
    setLoadingSeasons(true)
    setShowCopyModal(true)
    setCopyError(null)
    try {
        const res = await fetch('/api/admin/survivor/scoring/seasons')
        const data = await res.json()

        const other = data.seasons.filter((s: any) => s.id !== season.id)
        setAvailableSeasons(other)
    }catch {
        setCopyError('Failed to load seasons')
    } finally {
        setLoadingSeasons(false)
    }
  }, [season.id])

  const handleSelectSeason = useCallback((seasonId: string) => {
    setCopyFromSeasonId(seasonId)
    const selected = availableSeasons.find(s => s.id === seasonId)
    if (selected) {
        setSelectedEventIds(new Set(selected.scoringEvents.map(e => e.id)))
    }
  }, [availableSeasons])

  const handleCopy = useCallback(async () => {
    if (!copyFromSeasonId || selectedEventIds.size === 0) {
        setCopyError('Select a Season and at least one Event')
        return
    }
    setCopyLoading(true)
    setCopyError(null)
    try {
        const res = await fetch('/api/admin/survivor/scoring/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toSeasonId: season.id,
                eventIds: Array.from(selectedEventIds)
            })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to copy events')
        setShowCopyModal(false)
        setCopyFromSeasonId('')
        setSelectedEventIds(new Set())
        router.refresh()
    } catch (err) {
        setCopyError(err instanceof Error ? err.message : 'Failed to copy events')
    } finally {
        setCopyLoading(false)
    }
  }, [copyFromSeasonId, selectedEventIds, season.id, router])

  const openAdd = useCallback(() => {
    setForm(emptyForm)
    setFormError(null)
    setShowAdd(true)
  }, [])

  const openEdit = useCallback((event: ScoringEvent) => {
    setForm({
      label: event.label,
      points: event.points.toString(),
      category: event.category,
    })
    setFormError(null)
    setEditingEvent(event)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.label || !form.points) {
      setFormError('Label and points are required')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const body = {
        seasonId: season.id,
        label: form.label,
        points: parseInt(form.points),
        category: form.category,
        ...(editingEvent && { eventId: editingEvent.id }),
      }

      const res = await fetch(
        editingEvent
          ? '/api/admin/survivor/scoring/update'
          : '/api/admin/survivor/scoring/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save scoring event')

      setShowAdd(false)
      setEditingEvent(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save scoring event')
    } finally {
      setFormLoading(false)
    }
  }, [form, editingEvent, season.id, router])

  const handleDelete = useCallback((event: ScoringEvent) => {
    setConfirm({
      title: 'Delete scoring event',
      message: `Delete "${event.label}"? Any stats using this event will also be deleted.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/scoring/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: event.id })
          })
          if (!res.ok) throw new Error('Failed to delete scoring event')
          router.refresh()
        } catch {
          // handle error
        } finally {
          setConfirmLoading(false)
          setConfirm(null)
        }
      }
    })
  }, [router])

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    events: season.scoringEvents.filter(e => e.category === cat.value)
  })).filter(g => g.events.length > 0)

  const isOpen = showAdd || !!editingEvent

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{season.scoringEvents.length} scoring events</p>
        <button
          onClick={handleOpenCopy}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          Copy From Season
        </button>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Event
        </button>
      </div>

      {season.scoringEvents.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No scoring events yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {grouped.map(group => (
          <div key={group.value} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_STYLES[group.value]}`}>
                {group.label}
              </span>
            </div>
            {group.events.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-4 px-4 py-3 border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{event.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${event.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {event.points >= 0 ? '+' : ''}{event.points} pts
                  </span>
                  <button
                    onClick={() => openEdit(event)}
                    className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">
              {editingEvent ? 'Edit Scoring Event' : 'Add Scoring Event'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Define a scoring event and its point value.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. Won individual immunity"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Points <span className="text-gray-600">(use negative for penalties)</span>
                  </label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={e => setForm(prev => ({ ...prev, points: e.target.value }))}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAdd(false)
                  setEditingEvent(null)
                  setFormError(null)
                }}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {formLoading ? 'Saving...' : editingEvent ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy from season modal */}
        {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-white mb-1">Copy Scoring Events</h3>
            <p className="text-sm text-gray-400 mb-6">
                Select a season to copy events from. All events are pre-selected — deselect any you don't want.
            </p>

            {loadingSeasons ? (
                <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                {/* Season selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Copy from season
                    </label>
                    <select
                    value={copyFromSeasonId}
                    onChange={e => handleSelectSeason(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                    >
                    <option value="">Select a season...</option>
                    {availableSeasons
                        .filter(s => s.scoringEvents.length > 0)
                        .map(s => (
                        <option key={s.id} value={s.id}>
                            Season {s.number} — {s.title} ({s.scoringEvents.length} events)
                        </option>
                        ))
                    }
                    </select>
                </div>

                {/* Event list */}
                {copyFromSeasonId && (() => {
                    const selectedSeason = availableSeasons.find(s => s.id === copyFromSeasonId)
                    if (!selectedSeason) return null

                    const grouped = CATEGORIES.map(cat => ({
                    ...cat,
                    events: selectedSeason.scoringEvents.filter(e => e.category === cat.value)
                    })).filter(g => g.events.length > 0)

                    return (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            {selectedEventIds.size} of {selectedSeason.scoringEvents.length} events selected
                        </p>
                        <div className="flex gap-2">
                            <button
                            onClick={() => setSelectedEventIds(new Set(selectedSeason.scoringEvents.map(e => e.id)))}
                            className="text-xs text-green-400 hover:text-green-300"
                            >
                            Select all
                            </button>
                            <span className="text-gray-600">·</span>
                            <button
                            onClick={() => setSelectedEventIds(new Set())}
                            className="text-xs text-gray-400 hover:text-gray-300"
                            >
                            Deselect all
                            </button>
                        </div>
                        </div>

                        {grouped.map(group => (
                        <div key={group.value} className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 border-b border-gray-700">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_STYLES[group.value]}`}>
                                {group.label}
                            </span>
                            </div>
                            {group.events.map(event => (
                            <button
                                key={event.id}
                                onClick={() => setSelectedEventIds(prev => {
                                const next = new Set(prev)
                                if (next.has(event.id)) next.delete(event.id)
                                else next.add(event.id)
                                return next
                                })}
                                className={`w-full flex items-center justify-between px-3 py-2 border-t border-gray-700 text-left transition-colors ${
                                selectedEventIds.has(event.id)
                                    ? 'bg-green-900/20'
                                    : 'hover:bg-gray-700/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                    selectedEventIds.has(event.id)
                                    ? 'bg-green-600 border-green-600'
                                    : 'border-gray-600'
                                }`}>
                                    {selectedEventIds.has(event.id) && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    )}
                                </div>
                                <span className="text-sm text-gray-300">{event.label}</span>
                                </div>
                                <span className={`text-xs font-medium flex-shrink-0 ${
                                event.points >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {event.points >= 0 ? '+' : ''}{event.points}
                                </span>
                            </button>
                            ))}
                        </div>
                        ))}
                    </div>
                    )
                })()}

                {copyError && (
                    <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                    {copyError}
                    </p>
                )}
                </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
                <button
                onClick={() => {
                    setShowCopyModal(false)
                    setCopyFromSeasonId('')
                    setSelectedEventIds(new Set())
                    setCopyError(null)
                }}
                disabled={copyLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                Cancel
                </button>
                <button
                onClick={handleCopy}
                disabled={copyLoading || selectedEventIds.size === 0}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                >
                {copyLoading ? 'Copying...' : `Copy ${selectedEventIds.size} event${selectedEventIds.size !== 1 ? 's' : ''}`}
                </button>
            </div>
            </div>
        </div>
        )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-2">{confirm.title}</h3>
            <p className="text-sm text-gray-400 mb-6">{confirm.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)} disabled={confirmLoading} className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={confirm.onConfirm} disabled={confirmLoading} className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {confirmLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}