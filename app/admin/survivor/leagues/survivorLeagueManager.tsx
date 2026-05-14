'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Season = {
  id: string
  number: number
  title: string
  isActive: boolean
}

type User = {
  id: string
  username: string
  email: string
}

type Member = {
  id: string
  isAdmin: boolean
  points: number
  user: User
}

type Tribe = {
  id: string
  name: string
}

type League = {
  id: string
  name: string
  survivorSeasonId: string
  survivorSeason: Season
  members: Member[]
  tribes: Tribe[]
  createdAt: Date
}

type Props = {
  leagues: League[]
  seasons: Season[]
  allUsers: User[]
  currentUserId: string
}

type ConfirmDialog = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
} | null

export default function SurvivorLeaguesManager({
  leagues,
  seasons,
  allUsers,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState<string | null>(null)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', survivorSeasonId: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({ name: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Add member
  const [selectedUserId, setSelectedUserId] = useState('')
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [addMemberLoading, setAddMemberLoading] = useState(false)

  const handleCreateLeague = useCallback(async () => {
    if (!createForm.name) {
      setCreateError('League name is required')
      return
    }
    if (!createForm.survivorSeasonId) {
      setCreateError('Please select a season')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/survivor/leagues/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create league')
      setShowCreate(false)
      setCreateForm({ name: '', survivorSeasonId: '' })
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create league')
    } finally {
      setCreateLoading(false)
    }
  }, [createForm, router])

  const handleEditLeague = useCallback(async () => {
    if (!editingLeague || !editForm.name) {
      setEditError('League name is required')
      return
    }
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch('/api/admin/survivor/leagues/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: editingLeague.id,
          name: editForm.name,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update league')
      setEditingLeague(null)
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update league')
    } finally {
      setEditLoading(false)
    }
  }, [editingLeague, editForm, router])

  const handleAddMember = useCallback(async () => {
    if (!showAddMember || !selectedUserId) {
      setAddMemberError('Please select a user')
      return
    }
    setAddMemberLoading(true)
    setAddMemberError(null)
    try {
      const res = await fetch('/api/admin/survivor/leagues/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: showAddMember,
          userId: selectedUserId,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member')
      setShowAddMember(null)
      setSelectedUserId('')
      router.refresh()
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAddMemberLoading(false)
    }
  }, [showAddMember, selectedUserId, router])

  const handleRemoveMember = useCallback((league: League, member: Member) => {
    setConfirm({
      title: 'Remove member',
      message: `Remove ${member.user.username} from ${league.name}? Their tribe and picks will be deleted.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/leagues/remove-member', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leagueId: league.id,
              userId: member.user.id,
            })
          })
          if (!res.ok) throw new Error('Failed to remove member')
          router.refresh()
        } catch {
          setError('Failed to remove member')
        } finally {
          setLoading(false)
          setConfirm(null)
        }
      }
    })
  }, [router])

  const handleToggleAdmin = useCallback((league: League, member: Member) => {
    const promoting = !member.isAdmin
    setConfirm({
      title: promoting ? 'Make league admin' : 'Remove league admin',
      message: promoting
        ? `Make ${member.user.username} a league admin?`
        : `Remove league admin from ${member.user.username}?`,
      confirmLabel: promoting ? 'Make admin' : 'Remove admin',
      onConfirm: async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/leagues/toggle-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leagueId: league.id,
              userId: member.user.id,
              isAdmin: promoting,
            })
          })
          if (!res.ok) throw new Error('Failed to update admin')
          router.refresh()
        } catch {
          setError('Failed to update admin status')
        } finally {
          setLoading(false)
          setConfirm(null)
        }
      }
    })
  }, [router])

  const handleDeleteLeague = useCallback((league: League) => {
    setConfirm({
      title: 'Delete league',
      message: `Delete ${league.name}? All tribes and picks will be deleted. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
      onConfirm: async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/leagues/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId: league.id })
          })
          if (!res.ok) throw new Error('Failed to delete league')
          router.refresh()
        } catch {
          setError('Failed to delete league')
        } finally {
          setLoading(false)
          setConfirm(null)
        }
      }
    })
  }, [router])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">Survivor Leagues</h1>
          <p className="text-sm text-gray-400 mt-1">{leagues.length} leagues</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Create League
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Leagues */}
      {leagues.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No Survivor leagues yet. Create one to get started!</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {leagues.map(league => (
          <div key={league.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* League header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-medium text-white">{league.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    Season {league.survivorSeason.number} — {league.survivorSeason.title}
                  </span>
                  {league.survivorSeason.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400 border border-green-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {league.members.length} members · {league.tribes.length} tribes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddMember(league.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  + Add Member
                </button>
                <button
                  onClick={() => {
                    setEditingLeague(league)
                    setEditForm({ name: league.name })
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteLeague(league)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Members table */}
            {league.members.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500">No members yet — add some!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <div className="col-span-3">Username</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-3">Tribe name</div>
                  <div className="col-span-1">Role</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {league.members.map(member => {
                  const memberTribe = league.tribes.find(
                    (t: any) => t.userId === member.user.id
                  )
                  return (
                    <div
                      key={member.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-gray-800 items-center hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-white">{member.user.username}</p>
                        {member.user.id === currentUserId && (
                          <span className="text-xs text-green-500">You</span>
                        )}
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-gray-400 truncate">{member.user.email}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-gray-400 truncate">
                          {(memberTribe as any)?.name ?? '—'}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          member.isAdmin
                            ? 'bg-green-900 text-green-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {member.isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        {member.user.id !== currentUserId && (
                          <>
                            <button
                              onClick={() => handleToggleAdmin(league, member)}
                              className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                            >
                              {member.isAdmin ? 'Remove admin' : 'Make admin'}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(league, member)}
                              className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create League Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Create Survivor League</h3>
            <p className="text-sm text-gray-400 mb-6">
              You will automatically be added as a league admin.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">League name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Family Survivor League"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Season</label>
                <select
                  value={createForm.survivorSeasonId}
                  onChange={e => setCreateForm(prev => ({ ...prev, survivorSeasonId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="">Select a season...</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      Season {s.number} — {s.title}
                      {s.isActive ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {createError && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreate(false)
                  setCreateForm({ name: '', survivorSeasonId: '' })
                  setCreateError(null)
                }}
                disabled={createLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLeague}
                disabled={createLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {createLoading ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit League Modal */}
      {editingLeague && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Edit League</h3>
            <p className="text-sm text-gray-400 mb-6">Update league name.</p>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">League name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            {editError && (
              <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mt-3">
                {editError}
              </p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setEditingLeague(null); setEditError(null) }}
                disabled={editLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLeague}
                disabled={editLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Add Member</h3>
            <p className="text-sm text-gray-400 mb-6">
              Add an existing user to this league. Their tribe will be created automatically.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Select user</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                <option value="">Select a user...</option>
                {allUsers
                  .filter(u => {
                    const league = leagues.find(l => l.id === showAddMember)
                    return !league?.members.some(m => m.user.id === u.id)
                  })
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </option>
                  ))
                }
              </select>
            </div>
            {addMemberError && (
              <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mt-3">
                {addMemberError}
              </p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddMember(null)
                  setSelectedUserId('')
                  setAddMemberError(null)
                }}
                disabled={addMemberLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addMemberLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {addMemberLoading ? 'Adding...' : 'Add Member'}
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
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}