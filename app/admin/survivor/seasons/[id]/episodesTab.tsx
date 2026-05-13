'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link  from 'next/link'

type Episode = {
  id: string
  number: number
  name: string
  airDate: Date
  isAired: boolean
  isMerge: boolean
  isFinale: boolean
}

type Season = {
  id: string
  episodes: Episode[]
}

type Props = {
  season: Season
}

type EpisodeForm = {
  number: string
  name: string
  airDate: string
  isAired: boolean
  isMerge: boolean
  isFinale: boolean
}

const emptyForm: EpisodeForm = {
  number: '',
  name: '',
  airDate: '',
  isAired: false,
  isMerge: false,
  isFinale: false,
}

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function EpisodesTab({ season }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [form, setForm] = useState<EpisodeForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const openAdd = useCallback(() => {
    setForm({
      ...emptyForm,
      number: (season.episodes.length + 1).toString(),
    })
    setFormError(null)
    setShowAdd(true)
  }, [season.episodes.length])

  const openEdit = useCallback((episode: Episode) => {
    setForm({
      number: episode.number.toString(),
      name: episode.name,
      airDate: new Date(episode.airDate).toISOString().split('T')[0],
      isAired: episode.isAired,
      isMerge: episode.isMerge,
      isFinale: episode.isFinale,
    })
    setFormError(null)
    setEditingEpisode(episode)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.number || !form.name || !form.airDate) {
      setFormError('Episode number, name and air date are required')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const body = {
        seasonId: season.id,
        number: parseInt(form.number),
        name: form.name,
        airDate: form.airDate,
        isAired: form.isAired,
        isMerge: form.isMerge,
        isFinale: form.isFinale,
        ...(editingEpisode && { episodeId: editingEpisode.id }),
      }

      const res = await fetch(
        editingEpisode
          ? '/api/admin/survivor/episodes/update'
          : '/api/admin/survivor/episodes/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save episode')

      setShowAdd(false)
      setEditingEpisode(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save episode')
    } finally {
      setFormLoading(false)
    }
  }, [form, editingEpisode, season.id, router])

  const handleDelete = useCallback((episode: Episode) => {
    setConfirm({
      title: 'Delete episode',
      message: `Delete Episode ${episode.number}: ${episode.name}? All scoring stats for this episode will also be deleted.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/episodes/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: episode.id })
          })
          if (!res.ok) throw new Error('Failed to delete episode')
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

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
    <div className="flex items-center gap-3">
      <button
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-gray-700'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  )

  const isOpen = showAdd || !!editingEpisode

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{season.episodes.length} episodes</p>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Episode
        </button>
      </div>

      {season.episodes.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No episodes yet.</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-800 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Air Date</div>
          <div className="col-span-3">Flags</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {season.episodes.map((episode: Episode) => (
          <div
            key={episode.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-gray-800 items-center hover:bg-gray-800/30 transition-colors"
          >
            <div className="col-span-1 text-sm text-gray-400">{episode.number}</div>
            <div className="col-span-4">
              <p className="text-sm font-medium text-white truncate">{episode.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-400">
                {new Date(episode.airDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="col-span-3 flex gap-1.5 flex-wrap">
              {episode.isAired && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  Aired
                </span>
              )}
              {episode.isMerge && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-400 border border-blue-700">
                  Merge
                </span>
              )}
              {episode.isFinale && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900 text-yellow-400 border border-yellow-700">
                  Finale
                </span>
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-1.5">
              <Link
                href={`/admin/survivor/seasons/${season.id}/episodes/${episode.id}`}
                className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Manage
              </Link>
              <button
                onClick={() => openEdit(episode)}
                className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(episode)}
                className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">
              {editingEpisode ? 'Edit Episode' : 'Add Episode'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {editingEpisode ? 'Update episode details.' : 'Add a new episode.'}
            </p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Episode #</label>
                  <input
                    type="number"
                    value={form.number}
                    onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Episode name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. It's a Me Game"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Air date</label>
                <input
                  type="date"
                  value={form.airDate}
                  onChange={e => setForm(prev => ({ ...prev, airDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Toggle
                  label="Episode has aired"
                  value={form.isAired}
                  onChange={() => setForm(prev => ({ ...prev, isAired: !prev.isAired }))}
                />
                <Toggle
                  label="Merge episode"
                  value={form.isMerge}
                  onChange={() => setForm(prev => ({ ...prev, isMerge: !prev.isMerge }))}
                />
                <Toggle
                  label="Finale episode"
                  value={form.isFinale}
                  onChange={() => setForm(prev => ({ ...prev, isFinale: !prev.isFinale }))}
                />
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
                  setEditingEpisode(null)
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
                {formLoading ? 'Saving...' : editingEpisode ? 'Save Changes' : 'Add Episode'}
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