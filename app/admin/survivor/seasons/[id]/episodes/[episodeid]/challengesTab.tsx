'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Contestant = {
  id: string
  survivorPlayer: { id: string; name: string; imageUrl: string | null }
  tribeMemberships: { tribe: { name: string; color: string } }[]
}

type ChallengeTeam = {
  id: string
  name: string | null
  color: string | null
  contestants: Contestant[]
  result: { placement: number } | null
}

type Challenge = {
  id: string
  name: string | null
  type: string
  isIndividual: boolean
  isFiremaking: boolean
  reward: string | null
  order: number
  teams: ChallengeTeam[]
  results: {
    id: string
    placement: number
    contestantId: string | null
    teamId: string | null
    contestant: Contestant | null
  }[]
}

type Episode = {
  id: string
  challenges: Challenge[]
}

type Props = {
  episode: Episode
  contestants: Contestant[]
}

type ChallengeForm = {
  name: string
  type: string
  isIndividual: boolean
  isFiremaking: boolean
  reward: string
}

const emptyForm: ChallengeForm = {
  name: '',
  type: 'immunity',
  isIndividual: true,
  isFiremaking: false,
  reward: '',
}

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

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function ChallengesTab({ episode, contestants }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ChallengeForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // For managing winners after creation
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<Set<string>>(new Set())
  const [savingWinners, setSavingWinners] = useState<string | null>(null)

  const handleCreateChallenge = useCallback(async () => {
    setFormLoading(true)
    setFormError(null)
    try {
      const res = await fetch('/api/admin/survivor/challenges/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          ...form,
          reward: form.reward || null,
          order: episode.challenges.length + 1,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create challenge')
      setShowAdd(false)
      setForm(emptyForm)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create challenge')
    } finally {
      setFormLoading(false)
    }
  }, [form, episode.id, episode.challenges.length, router])

  const handleDeleteChallenge = useCallback((challenge: Challenge) => {
    setConfirm({
      title: 'Delete challenge',
      message: `Delete this ${challenge.type} challenge? All results will be removed.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/challenges/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: challenge.id })
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

  const handleSaveWinners = useCallback(async (challengeId: string) => {
    setSavingWinners(challengeId)
    try {
      const res = await fetch('/api/admin/survivor/challenges/set-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          contestantIds: Array.from(selectedWinnerIds),
        })
      })
      if (!res.ok) throw new Error('Failed to save winners')
      setSelectedWinnerIds(new Set())
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSavingWinners(null)
    }
  }, [selectedWinnerIds, router])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{episode.challenges.length} challenges</p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Challenge
        </button>
      </div>

      {episode.challenges.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No challenges yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {episode.challenges.map(challenge => (
          <div key={challenge.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Challenge header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-400 border border-blue-700 font-medium capitalize">
                  {challenge.type}
                </span>
                {challenge.isIndividual && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    Individual
                  </span>
                )}
                {challenge.isFiremaking && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400 border border-orange-700">
                    🔥 Firemaking
                  </span>
                )}
                <p className="text-sm font-medium text-white">
                  {challenge.name || `${challenge.type} challenge`}
                </p>
                {challenge.reward && (
                  <p className="text-xs text-gray-400">Reward: {challenge.reward}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteChallenge(challenge)}
                className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Winners */}
            <div className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                {challenge.isIndividual ? 'Winner' : 'Winning Team'}
              </p>

              {challenge.results.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {challenge.results
                    .filter(r => r.placement === 1)
                    .map(r => (
                      <div key={r.id} className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-3 py-1.5">
                        <span className="text-sm text-green-400">
                          {r.contestant?.survivorPlayer.name ?? 'Team winner'}
                        </span>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-3">No winner recorded yet</p>
              )}

              {/* Set winners */}
              <div className="flex flex-wrap gap-2 mb-3">
                {contestants.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedWinnerIds(prev => {
                        const next = new Set(prev)
                        if (next.has(c.id)) next.delete(c.id)
                        else next.add(c.id)
                        return next
                      })
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-colors ${
                      selectedWinnerIds.has(c.id)
                        ? 'bg-green-900/40 border-green-600 text-green-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {c.survivorPlayer.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleSaveWinners(challenge.id)}
                disabled={savingWinners === challenge.id || selectedWinnerIds.size === 0}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {savingWinners === challenge.id ? 'Saving...' : 'Set as winner(s)'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Challenge Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Add Challenge</h3>
            <p className="text-sm text-gray-400 mb-6">Add a challenge from this episode.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Challenge name <span className="text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Muddy Waters"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="immunity">Immunity</option>
                  <option value="reward">Reward</option>
                  <option value="combined">Combined (Immunity + Reward)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Reward <span className="text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  value={form.reward}
                  onChange={e => setForm(prev => ({ ...prev, reward: e.target.value }))}
                  placeholder="e.g. Steak dinner"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Toggle
                  label="Individual challenge"
                  value={form.isIndividual}
                  onChange={() => setForm(prev => ({ ...prev, isIndividual: !prev.isIndividual }))}
                />
                <Toggle
                  label="Firemaking challenge"
                  value={form.isFiremaking}
                  onChange={() => setForm(prev => ({ ...prev, isFiremaking: !prev.isFiremaking }))}
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
                onClick={handleCreateChallenge}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {formLoading ? 'Adding...' : 'Add Challenge'}
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