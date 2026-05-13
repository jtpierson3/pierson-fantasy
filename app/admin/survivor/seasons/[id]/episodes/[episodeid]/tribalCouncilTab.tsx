'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Contestant = {
  id: string
  status: string
  survivorPlayer: { name: string; imageUrl: string | null }
  tribeMemberships: { tribe: { name: string; color: string } }[]
}

type VotingRecord = {
  id: string
  voterId: string
  votedForId: string
  isRevoked: boolean
  voter: { survivorPlayer: { name: string } }
  votedFor: { survivorPlayer: { name: string } }
}

type TribalCouncil = {
  id: string
  order: number
  isFiremaking: boolean
  notes: string | null
  eliminatedId: string | null
  eliminated: { survivorPlayer: { name: string } } | null
  votes: VotingRecord[]
}

type Episode = {
  id: string
  tribalCouncils: TribalCouncil[]
}

type Props = {
  episode: Episode
  contestants: Contestant[]
}

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function TribalCouncilTab({ episode, contestants }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [isFiremaking, setIsFiremaking] = useState(false)
  const [notes, setNotes] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Voting state
  const [activeTribalId, setActiveTribalId] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, string>>({}) // voterId -> votedForId
  const [eliminatedId, setEliminatedId] = useState<string>('')
  const [savingVotes, setSavingVotes] = useState(false)

  const handleCreateTribal = useCallback(async () => {
    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/survivor/tribal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          order: episode.tribalCouncils.length + 1,
          isFiremaking,
          notes: notes || null,
        })
      })
      if (!res.ok) throw new Error('Failed to create tribal council')
      setShowAdd(false)
      setIsFiremaking(false)
      setNotes('')
      router.refresh()
    } catch {
      // handle error
    } finally {
      setFormLoading(false)
    }
  }, [episode.id, episode.tribalCouncils.length, isFiremaking, notes, router])

  const handleSaveVotes = useCallback(async (tribalId: string) => {
    setSavingVotes(true)
    try {
      const res = await fetch('/api/admin/survivor/tribal/save-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribalCouncilId: tribalId,
          votes: Object.entries(votes).map(([voterId, votedForId]) => ({
            voterId,
            votedForId,
          })),
          eliminatedId: eliminatedId || null,
        })
      })
      if (!res.ok) throw new Error('Failed to save votes')
      setActiveTribalId(null)
      setVotes({})
      setEliminatedId('')
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSavingVotes(false)
    }
  }, [votes, eliminatedId, router])

  const handleDeleteTribal = useCallback((tribal: TribalCouncil) => {
    setConfirm({
      title: 'Delete tribal council',
      message: 'Delete this tribal council? All votes will be removed.',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/tribal/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tribalCouncilId: tribal.id })
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{episode.tribalCouncils.length} tribal councils</p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Tribal Council
        </button>
      </div>

      {episode.tribalCouncils.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No tribal councils yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {episode.tribalCouncils.map(tribal => (
          <div key={tribal.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">
                  Tribal Council {tribal.order}
                </span>
                {tribal.isFiremaking && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400 border border-orange-700">
                    🔥 Firemaking
                  </span>
                )}
                {tribal.eliminated && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400 border border-red-700">
                    Eliminated: {tribal.eliminated.survivorPlayer.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTribalId(activeTribalId === tribal.id ? null : tribal.id)
                    setVotes({})
                    setEliminatedId(tribal.eliminatedId ?? '')
                  }}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  {activeTribalId === tribal.id ? 'Close' : 'Enter Votes'}
                </button>
                <button
                  onClick={() => handleDeleteTribal(tribal)}
                  className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Existing votes */}
            {tribal.votes.length > 0 && activeTribalId !== tribal.id && (
              <div className="p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Votes</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {tribal.votes.map(vote => (
                    <div
                      key={vote.id}
                      className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg ${
                        vote.isRevoked
                          ? 'bg-gray-800/30 text-gray-600 line-through'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      <span>{vote.voter.survivorPlayer.name.split(' ')[0]}</span>
                      <span className="text-gray-600">→</span>
                      <span>{vote.votedFor.survivorPlayer.name.split(' ')[0]}</span>
                      {vote.isRevoked && <span className="text-orange-400 ml-1">🔮</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vote entry */}
            {activeTribalId === tribal.id && (
              <div className="p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Enter Votes</p>

                <div className="flex flex-col gap-2 mb-4">
                  {contestants.filter(c => c.status !== 'eliminated' || c.id === tribal.eliminatedId).map(contestant => (
                    <div key={contestant.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-300 w-28 truncate flex-shrink-0">
                        {contestant.survivorPlayer.name.split(' ')[0]}
                      </span>
                      <span className="text-gray-600 text-xs">voted for</span>
                      <select
                        value={votes[contestant.id] ?? ''}
                        onChange={e => setVotes(prev => ({
                          ...prev,
                          [contestant.id]: e.target.value
                        }))}
                        className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                      >
                        <option value="">— did not vote —</option>
                        {contestants
                          .filter(c => c.id !== contestant.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.survivorPlayer.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-300 w-28 flex-shrink-0">Eliminated</span>
                  <select
                    value={eliminatedId}
                    onChange={e => setEliminatedId(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="">— no elimination —</option>
                    {contestants.map(c => (
                      <option key={c.id} value={c.id}>{c.survivorPlayer.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleSaveVotes(tribal.id)}
                  disabled={savingVotes}
                  className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {savingVotes ? 'Saving...' : 'Save Votes'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Tribal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Add Tribal Council</h3>
            <p className="text-sm text-gray-400 mb-6">Add a tribal council from this episode.</p>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFiremaking(prev => !prev)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isFiremaking ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFiremaking ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-300">Firemaking tribal</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Notes <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any notable events at tribal..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowAdd(false)}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTribal}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {formLoading ? 'Adding...' : 'Add Tribal Council'}
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