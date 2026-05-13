'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Tribe = {
  id: string
  name: string
  color: string
}

type Season = {
  id: string
  tribes: Tribe[]
}

type Props = {
  season: Season
}

type TribeForm = {
  name: string
  color: string
}

const emptyForm: TribeForm = { name: '', color: '#e74c3c' }

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#ffffff', '#95a5a6',
]

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function TribesTab({ season }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingTribe, setEditingTribe] = useState<Tribe | null>(null)
  const [form, setForm] = useState<TribeForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const openAdd = useCallback(() => {
    setForm(emptyForm)
    setFormError(null)
    setShowAdd(true)
  }, [])

  const openEdit = useCallback((tribe: Tribe) => {
    setForm({ name: tribe.name, color: tribe.color })
    setFormError(null)
    setEditingTribe(tribe)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.name) {
      setFormError('Tribe name is required')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const body = {
        seasonId: season.id,
        name: form.name,
        color: form.color,
        ...(editingTribe && { tribeId: editingTribe.id }),
      }

      const res = await fetch(
        editingTribe
          ? '/api/admin/survivor/tribes/update'
          : '/api/admin/survivor/tribes/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save tribe')

      setShowAdd(false)
      setEditingTribe(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save tribe')
    } finally {
      setFormLoading(false)
    }
  }, [form, editingTribe, season.id, router])

  const handleDelete = useCallback((tribe: Tribe) => {
    setConfirm({
      title: 'Delete tribe',
      message: `Delete ${tribe.name}? This will remove all tribe memberships.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/tribes/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tribeId: tribe.id })
          })
          if (!res.ok) throw new Error('Failed to delete tribe')
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

  const isOpen = showAdd || !!editingTribe

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{season.tribes.length} tribes</p>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Tribe
        </button>
      </div>

      {season.tribes.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No tribes yet.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {season.tribes.map((tribe: Tribe) => (
          <div
            key={tribe.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-lg flex-shrink-0"
              style={{ backgroundColor: tribe.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{tribe.name}</p>
              <p className="text-xs text-gray-500">{tribe.color}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => openEdit(tribe)}
                className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(tribe)}
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
              {editingTribe ? 'Edit Tribe' : 'Add Tribe'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Add a tribe from the show.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Tribe name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Luvu"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Tribe color
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        form.color === color
                          ? 'border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
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
                  setEditingTribe(null)
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
                {formLoading ? 'Saving...' : editingTribe ? 'Save Changes' : 'Add Tribe'}
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
                {confirmLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}