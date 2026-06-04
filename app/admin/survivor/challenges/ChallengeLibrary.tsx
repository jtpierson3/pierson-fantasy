'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Prisma } from '@prisma/client'

type ChallengeWithHistory = Prisma.SurvivorChallengeGetPayload<{
  include: {
    challenges: {
      include: {
        episode: {
          include: { survivorSeason: true }
        }
      }
    }
  }
}>

type ChallengeForm = {
  name: string
  description: string
}

const emptyForm: ChallengeForm = {
  name: '',
  description: '',
}

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function ChallengeLibrary({
  challenges,
}: {
  challenges: ChallengeWithHistory[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<ChallengeWithHistory | null>(null)
  const [form, setForm] = useState<ChallengeForm>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const filtered = challenges.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = useCallback(() => {
    setForm(emptyForm)
    setFormError(null)
    setEditingChallenge(null)
    setShowAdd(true)
  }, [])

  const openEdit = useCallback((challenge: ChallengeWithHistory) => {
    setForm({
      name: challenge.name,
      description: challenge.description ?? '',
    })
    setFormError(null)
    setEditingChallenge(challenge)
    setShowAdd(true)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      const url = editingChallenge
        ? '/api/admin/survivor/challenges/library/update'
        : '/api/admin/survivor/challenges/library/create'

      const body = {
        name: form.name.trim(),
        description: form.description || null,
        ...(editingChallenge && { survivorChallengeId: editingChallenge.id })
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setShowAdd(false)
      setForm(emptyForm)
      setEditingChallenge(null)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setFormLoading(false)
    }
  }, [form, editingChallenge, router])

  const handleDelete = useCallback((challenge: ChallengeWithHistory) => {
    setConfirm({
      title: 'Delete challenge',
      message: `Delete "${challenge.name}"? This will unlink it from all episodes but won't delete the episode challenges themselves.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/challenges/library/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ survivorChallengeId: challenge.id })
          })
          if (!res.ok) throw new Error('Failed to delete')
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">Challenge Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">{challenges.length} challenges</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Challenge
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search challenges..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      {/* Challenge list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No challenges found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(challenge => (
            <div
              key={challenge.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{challenge.name}</p>
                  {challenge.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {challenge.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEdit(challenge)}
                    className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(challenge)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Season history */}
              {challenge.challenges.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                    Appeared in {challenge.challenges.length} episode{challenge.challenges.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {challenge.challenges.map(c => (
                      <span
                        key={c.id}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-300"
                      >
                        S{c.episode.survivorSeason.number} Ep {c.episode.number}
                        {c.name && ` — ${c.name}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">
              {editingChallenge ? 'Edit Challenge' : 'Add Challenge'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {editingChallenge
                ? 'Update this challenge in the library.'
                : 'Add a new challenge to the library.'}
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Distress Signal"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Description <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the challenge..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
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
                onClick={() => { setShowAdd(false); setFormError(null) }}
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
                {formLoading ? 'Saving...' : editingChallenge ? 'Save changes' : 'Add Challenge'}
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