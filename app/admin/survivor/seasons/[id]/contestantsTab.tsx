'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
//import ImageUpload from '@/app/components/ImageUpload'

type Player = {
  id: string
  name: string
  imageUrl: string | null
}

type Tribe = {
  id: string
  name: string
  color: string
}

type Contestant = {
  id: string
  status: string
  eliminatedEpisode: number | null
  placement: number | null
  survivorPlayer: Player
  tribeMemberships: {
    id: string
    tribe: Tribe
    isCurrent: boolean
  }[]
}

type Season = {
  id: string
  contestants: Contestant[]
  tribes: Tribe[]
}

type Props = {
  season: Season
  allPlayers: Player[]
}

type ContestantForm = {
  survivorPlayerId: string
  newPlayerName: string
  newPlayerImageUrl: string
  status: string
  placement: string
  eliminatedEpisode: string
  tribeId: string
}

const emptyForm: ContestantForm = {
  survivorPlayerId: '',
  newPlayerName: '',
  newPlayerImageUrl: '',
  status: 'active',
  placement: '',
  eliminatedEpisode: '',
  tribeId: '',
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'eliminated', label: 'Eliminated' },
  { value: 'jury', label: 'Jury' },
  { value: 'finalist', label: 'Finalist' },
  { value: 'winner', label: 'Winner' },
]

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-900 text-green-400 border-green-700',
  eliminated: 'bg-gray-800 text-gray-400 border-gray-700',
  jury: 'bg-blue-900 text-blue-400 border-blue-700',
  finalist: 'bg-purple-900 text-purple-400 border-purple-700',
  winner: 'bg-yellow-900 text-yellow-400 border-yellow-700',
}

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function ContestantsTab({ season, allPlayers }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null)
  const [form, setForm] = useState<ContestantForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [useExistingPlayer, setUseExistingPlayer] = useState(true)

  const openAdd = useCallback(() => {
    setForm(emptyForm)
    setFormError(null)
    setUseExistingPlayer(true)
    setShowAdd(true)
  }, [])

  const openEdit = useCallback((contestant: Contestant) => {
    setForm({
      survivorPlayerId: contestant.survivorPlayer.id,
      newPlayerName: '',
      newPlayerImageUrl: '',
      status: contestant.status,
      placement: contestant.placement?.toString() ?? '',
      eliminatedEpisode: contestant.eliminatedEpisode?.toString() ?? '',
      tribeId: contestant.tribeMemberships.find(t => t.isCurrent)?.tribe.id ?? '',
    })
    setFormError(null)
    setUseExistingPlayer(true)
    setEditingContestant(contestant)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (useExistingPlayer && !form.survivorPlayerId) {
      setFormError('Please select a player')
      return
    }
    if (!useExistingPlayer && !form.newPlayerName) {
      setFormError('Player name is required')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const body = {
        seasonId: season.id,
        survivorPlayerId: useExistingPlayer ? form.survivorPlayerId : null,
        newPlayerName: !useExistingPlayer ? form.newPlayerName : null,
        newPlayerImageUrl: !useExistingPlayer ? form.newPlayerImageUrl : null,
        status: form.status,
        placement: form.placement ? parseInt(form.placement) : null,
        eliminatedEpisode: form.eliminatedEpisode ? parseInt(form.eliminatedEpisode) : null,
        tribeId: form.tribeId || null,
        ...(editingContestant && { contestantId: editingContestant.id }),
      }

      const res = await fetch(
        editingContestant
          ? '/api/admin/survivor/contestants/update'
          : '/api/admin/survivor/contestants/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save contestant')

      setShowAdd(false)
      setEditingContestant(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save contestant')
    } finally {
      setFormLoading(false)
    }
  }, [form, editingContestant, season.id, useExistingPlayer, router])

  const handleDelete = useCallback((contestant: Contestant) => {
    setConfirm({
      title: 'Remove contestant',
      message: `Remove ${contestant.survivorPlayer.name} from this season?`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/contestants/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contestantId: contestant.id })
          })
          if (!res.ok) throw new Error('Failed to remove contestant')
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

  const isOpen = showAdd || !!editingContestant

  // Filter out players already in this season
  const existingPlayerIds = season.contestants.map(c => c.survivorPlayer.id)
  const availablePlayers = allPlayers.filter(
    p => !existingPlayerIds.includes(p.id) || editingContestant?.survivorPlayer.id === p.id
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{season.contestants.length} contestants</p>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Contestant
        </button>
      </div>

      {/* Contestants grid */}
      {season.contestants.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No contestants yet.</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {season.contestants.map((contestant: Contestant) => {
          const currentTribe = contestant.tribeMemberships.find(t => t.isCurrent)
          return (
            <div
              key={contestant.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
            >
              {/* Image */}
              <div className="relative h-24 bg-gray-800">
                {contestant.survivorPlayer.imageUrl ? (
                  <Image
                    src={contestant.survivorPlayer.imageUrl}
                    alt={contestant.survivorPlayer.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-2xl text-gray-600">
                      {contestant.survivorPlayer.name[0]}
                    </p>
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-1.5 right-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STATUS_STYLES[contestant.status]}`}>
                    {contestant.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">
                  {contestant.survivorPlayer.name}
                </p>
                {currentTribe && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentTribe.tribe.color }}
                    />
                    <p className="text-xs text-gray-400 truncate">
                      {currentTribe.tribe.name}
                    </p>
                  </div>
                )}
                {contestant.placement && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Placement: {contestant.placement}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => openEdit(contestant)}
                    className="flex-1 text-center px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contestant)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-white mb-1">
              {editingContestant ? 'Edit Contestant' : 'Add Contestant'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {editingContestant
                ? 'Update contestant details.'
                : 'Add a contestant to this season.'}
            </p>

            <div className="flex flex-col gap-4">
              {/* Player selection - only show on add */}
              {!editingContestant && (
                <>
                  {/* Toggle existing vs new */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseExistingPlayer(true)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        useExistingPlayer
                          ? 'bg-green-900 border-green-700 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Existing player
                    </button>
                    <button
                      onClick={() => setUseExistingPlayer(false)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        !useExistingPlayer
                          ? 'bg-green-900 border-green-700 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      New player
                    </button>
                  </div>

                  {useExistingPlayer ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Select player
                      </label>
                      <select
                        value={form.survivorPlayerId}
                        onChange={e => setForm(prev => ({ ...prev, survivorPlayerId: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                      >
                        <option value="">Select a player...</option>
                        {availablePlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                          Player name
                        </label>
                        <input
                          type="text"
                          value={form.newPlayerName}
                          onChange={e => setForm(prev => ({ ...prev, newPlayerName: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                          Player image
                        </label>
                        {/*<ImageUpload
                          value={form.newPlayerImageUrl}
                          onChange={url => setForm(prev => ({ ...prev, newPlayerImageUrl: url }))}
                          folder="survivor/players"
                          placeholder="Upload player image"
                        />*/}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Tribe */}
              {season.tribes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Current tribe <span className="text-gray-600">(optional)</span>
                  </label>
                  <select
                    value={form.tribeId}
                    onChange={e => setForm(prev => ({ ...prev, tribeId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">No tribe</option>
                    {season.tribes.map((t: Tribe) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Placement + Eliminated episode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Placement <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={form.placement}
                    onChange={e => setForm(prev => ({ ...prev, placement: e.target.value }))}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Eliminated ep. <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={form.eliminatedEpisode}
                    onChange={e => setForm(prev => ({ ...prev, eliminatedEpisode: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
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
                  setEditingContestant(null)
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
                {formLoading ? 'Saving...' : editingContestant ? 'Save Changes' : 'Add Contestant'}
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
              <button
                onClick={() => setConfirm(null)}
                disabled={confirmLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                disabled={confirmLoading}
                className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {confirmLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}