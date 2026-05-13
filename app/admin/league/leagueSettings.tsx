'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type User = {
    id: string
    username: string
    email: string
    isSiteAdmin: boolean
}

type LeagueMember = {
    id: string
    isAdmin: boolean
    user: User
}

type League = {
    id: string
    name: string
    description: string | null
    members: LeagueMember[]
    teams: { id: string }[]
}

type Props = {
    adminLeagues: League[]
    allLeagues: League[]
    allUsers: User[]
    currentUserId: string
    isSiteAdmin: boolean
}

type ConfirmDialog = {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
} | null

export default function LeagueSettings({
    adminLeagues,
    allLeagues,
    allUsers,
    currentUserId,
    isSiteAdmin,
}: Props) {
    const router = useRouter()
    const [showAllLeagues, setShowAllLeagues] = useState(false)
    const [showCreateLeague, setShowCreateLeague] = useState(false)
    const [showAddMember, setShowAddMember] = useState<string | null>(null)
    const [editingLeague, setEditingLeague] = useState<League | null>(null)
    const [confirm, setConfirm] = useState<ConfirmDialog>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    //Create league form
    const [createForm, setCreateForm] = useState({ name: '', description: '' })
    const [createError, setCreateError] = useState<string | null>(null)
    const [createLoading, setCreateLoading] = useState(false)

    // Edit League Form
    const [editForm, setEditForm] = useState({ name: '', description: '' })
    const [editError, setEditError] = useState<string | null>(null)
    const [editLoading, setEditLoading] = useState(false)

    // Add member Form
    const [selectedUserId, setSelectedUserId] = useState('')
    const [addMemberError, setAddMemberError] = useState<string | null>(null)
    const [addMemberLoading, setAddMemberLoading] = useState(false)

    const displayedLeagues = showAllLeagues ? allLeagues : adminLeagues

    const handleCreateLeague = useCallback(async () => {
        if (!createForm.name) {
            setCreateError('League name is required')
            return
        }
        setCreateLoading(true)
        setCreateError(null)
        try{
            const res = await fetch('/api/admin/league/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to create league')
            setShowCreateLeague(false)
            setCreateForm({ name: '', description: '' })
            router.refresh()
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create league')
        } finally {
            setCreateLoading(false)
        }
    }, [createForm, router])

    const handleEditLeague = useCallback(async () => {
        if (!editingLeague) return
        if (!editForm.name) {
            setEditError('League name is required')
            return
        }
        setEditLoading(true)
        setEditError(null)
        try {
            const res = await fetch('/api/admin/league/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leagueId: editingLeague.id,
                    ...editForm
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
           const res = await fetch('/api/admin/league/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leagueId: showAddMember,
                    userId: selectedUserId
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

    const handleRemoveMember = useCallback((league: League, member: LeagueMember) => {
        setConfirm({
            title: 'Remove from league',
            message: `ARe you sure you want to remove ${member.user.username} from ${league.name}?`,
            confirmLabel: 'Remove',
            onConfirm: async () => {
                setLoading(true)
                try {
                    const res = await fetch('/api/admin/users/remove-from/league', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: member.user.id,
                            leagueId: league.id
                        })
                    })
                    if (!res.ok) throw new Error('Failed to remove a member')
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

    const handleToggleAdmin = useCallback((league: League, member: LeagueMember) => {
        const promoting = !member.isAdmin
        setConfirm({
            title: promoting? 'Make league admin' : 'Remove league admin',
            message: promoting
                ? `Make ${member.user.username} a league admin? They will be able to manage league settings and users.`
                : `Remove league admin access from ${member.user.username}?`,
            confirmLabel: promoting ? 'Make admin' : 'Remove Admin',
            onConfirm: async () => {
                setLoading(true)
                try {
                    const res = await fetch('/api/admin/league/toggle-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            memberId: member.id,
                            isAdmin: promoting
                        })
                    })
                    if (!res.ok) throw new Error('Failed to update admin status')
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
            message: `Are you sure you want to permanelty delete ${league.name}? This will delete all teams matchups and gameweeks. This cannot be undone.`,
            confirmLabel: 'Delete permanently',
            onConfirm: async () => {
                setLoading(true)
                try {
                    const res = await fetch('/api/admin/league/delete', {
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
                    <h1 className="text-xl font-medium text-white">League Settings</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {showAllLeagues ? 'All Leagues' : 'Your Leagues'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isSiteAdmin && (
                        <button
                            onClick={() => setShowCreateLeague(true)}
                            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                        >
                            + Create League
                        </button>
                    )}
                    {isSiteAdmin && (
                        <button
                            onClick={() => setShowAllLeagues(prev => !prev)}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                                showAllLeagues
                                    ? 'bg-green-900 border-green-700 text-green-400'
                                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                        >
                            {showAllLeagues ? 'My Leagues' : 'All Leagues'}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Error */}
            {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Leagues */}
            <div className="flex flex-col gap-6">
                {displayedLeagues.length === 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                        <p className="text-sm text-gray-400">No leagues found.</p>
                    </div>
                )}

                {displayedLeagues.map(league => (
                    <div key={league.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        {/* League Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                            <div>
                                <h2 className="text-sm font-medium text-white">{league.name}</h2>
                                {league.description && (
                                    <p className="text-xs text-gray-400 mt-0.5">{league.description}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {league.members.length} members - {league.teams.length} teams
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
                                        setEditForm({
                                            name: league.name,
                                            description: league.description ?? '',
                                        })
                                    }}
                                    className="px-3 py=1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                >
                                    Edit
                                </button>
                                {isSiteAdmin && (
                                    <button
                                        onClick={() => handleDeleteLeague(league)}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Members Table */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                            <div className="col-span-3">Username</div>
                            <div className="col-span-4">Email</div>
                            <div className="col-span-2">Role</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {league.members.map(member => (
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
                                <div className="col-span-4">
                                    <p className="text-sm text-gray-400 truncate">{member.user.email}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        member.isAdmin
                                            ? 'bg-green-900 text-green-400'
                                            : 'bg-gray-800 text-gray-400'
                                    }`}>
                                        {member.isAdmin ? 'Admin' : 'Member'}
                                    </span>
                                </div>
                                <div className="col-span-3 flex justify-end gap-2">
                                    {member.user.id !== currentUserId && (
                                        <>
                                            <button
                                                onClick={() => handleToggleAdmin(league, member)}
                                                className="text-xs px-3 py-1.5 rounded-lg br-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                            >
                                                {member.isAdmin ? 'Remove admin' : 'Make admin' }
                                            </button>
                                            <button
                                                onClick={() => handleRemoveMember(league, member)}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Create League Modal*/}
            {showCreateLeague && (
                <div className="fixed inset-0 bg-black/60 flex items/center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-base font-medium text-white mb-1">Create League</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            You will be automatically added as a league admin.
                        </p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    League Name
                                </label>
                                <input 
                                    type="text"
                                    value={createForm.name}
                                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value}))}
                                    placeholder="My Fantasy League"
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Description <span className="text-gray-600">optional</span>
                                </label>
                                <textarea 
                                    value={createForm.description}
                                    onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="A brief description of your league"
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                                />
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
                                    setShowCreateLeague(false)
                                    setCreateForm({ name: '', description: ''})
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
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 maw-w-md w-full shadow-xl">
                        <h3 className="text-base font-medium text-white mb-1">Edit League</h3>
                        <p className="text-sm text-gray-400 mb-6">Update League Details</p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    League Name
                                </label>
                                <input 
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value}))}
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Description <span className="text-gray-600">optional</span>
                                </label>
                                <textarea 
                                    value={editForm.description}
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                                />
                            </div>
                            {editError && (
                                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                                    {editError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setEditingLeague(null)
                                    setEditError(null)
                                }}
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
                                {editLoading ? 'Creating...' : 'Create League'}
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
                            Add an existing site user to this league.
                        </p>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Select User
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                            >
                                <option value="">Select a user...</option>
                                {allUsers
                                    .filter(u => {
                                        const league = displayedLeagues.find(l => l.id === showAddMember)
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
                                className="px-4 py-2 text-sm rounded-lg br-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                            >
                                {addMemberLoading ? 'Adding...' : 'Add Member' }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION DIALOG */}
            {confirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-8000 rounded-xl p-6 max-w-md w-full shadow-xl">
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