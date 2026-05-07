'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StringDecoder } from 'string_decoder'

type FantasyTeam = {
    id: string
    name: string
}

type LeagueMemberUser = {
    id: string
    username: string
    email: string
    isSiteAdmin: boolean
    createdAt: Date
    fantasyTeams: FantasyTeam[]
}

type LeagueMember = {
    id: string
    isAdmin: boolean
    points: number
    user: LeagueMemberUser
}

type AllUser = {
    id: string
    username: string
    email: string
    isSiteAdmin: boolean
    createdAt: Date
    fantasyTeams: FantasyTeam[]
    leagues: { fantasyLeague: {name: string} }[]
}

type AddUserForm = {
    email: string
    username: string
}

type Props = {
    leagueMembers: LeagueMember[]
    allUsers: AllUser[]
    currentUserId: string
    isSiteAdmin: boolean
    leagueName: string
    leagueId: string
}

type ConfirmDialog = {
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
} | null

export default function UsersTable({
    leagueMembers,
    allUsers,
    currentUserId,
    isSiteAdmin,
    leagueName,
    leagueId,
}: Props) {
    const router = useRouter()
    const [showAllUsers, setShowAllUsers] = useState(false)
    const [confirm, setConfirm] = useState<ConfirmDialog>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showAddUser, setShowAddUser] = useState(false)
    const [addUserForm, setAddUserForm] = useState<AddUserForm>({ email: '', username: ''})
    const [addUserError, setAddUserError] = useState<string | null>(null)
    const [addUserLoading, setAddUserLoading] = useState(false)

    const handleAddUser = useCallback(async () => {
        if (!addUserForm.email || !addUserForm.username) {
            setAddUserError('Email and username are required')
            return
        }

        setAddUserLoading(true)
        setAddUserError(null)

        try {
            const res = await fetch('/api/admin/users/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addUserForm)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to add user')

            setShowAddUser(false)
            setAddUserForm({ email: '', username: ''})
            router.refresh()
        } catch (err) {
            setAddUserError(err instanceof Error ? err.message : 'Failed to add user')
        } finally {
            setAddUserLoading(false)
        }
    }, [addUserForm, router])

    const handleRemoveFromLeague = useCallback((member: LeagueMember) => {
        setConfirm({
            title: 'Remove from league',
            message: `Are you sure you want to remove ${member.user.username} from ${leagueName}? This will also delete their team and all associated data.`,
            confirmLabel: 'Remove',
            onConfirm: async () => {
                setLoading(true)
                setError(null)
                try {
                    const res = await fetch('/api/admin/users/remove-from-league', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: member.user.id,
                            leagueId
                        })
                    })
                } catch (err) {
                    setError('Failed to remove user from league')
                } finally {
                    setLoading(false)
                    setConfirm(null)
                }
            }
        })
    }, [leagueId, leagueName, router])

    const handleRemoveFromSite = useCallback((user: AllUser) => {
        setConfirm({
            title: 'Remove from Site',
            message: `Are you sure you want to permanently delete ${user.username}? This cannot be undone.`,
            confirmLabel: 'Delete Permanently',
            onConfirm: async () => {
                setLoading(true)
                setError(null)
                try {
                    const res = await fetch('/api/admin/users/remove-from-site', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    if (!res.ok) throw new Error('Failed to remove user')
                    router.refresh()
                } catch (err) {
                    setError('Failed to remove user from site')
                } finally {
                    setLoading(false)
                    setConfirm(null)
                }
            }
        })
    }, [router])

    const handleToggleSiteAdmin = useCallback((user: AllUser) => {
        const promoting = !user.isSiteAdmin
        setConfirm({
            title: promoting ? 'Promote to site admin' : 'Remove site admin',
            message: promoting
                ? `Are you sure you want to make ${user.username} a site admin? They will have full access to all admin features.`
                : `Are you sure you want to remove site admin access from ${user.username}?`,
            confirmLabel: promoting ? 'Promote' : 'Remove admin',
            onConfirm: async () => {
                setLoading(true)
                setError(null)
                try {
                    const res = await fetch('/api/admin/users/toggle-site-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            isSiteAdmin: promoting,
                        })
                    })
                    if (!res.ok) throw new Error('Failed to update user')
                    router.refresh()
                } catch (err) {
                    setError('Failed to update user')
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
                    <h1 className='text-xl font-medium text-white'>Users</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {showAllUsers ? 'All site users' : `Members of ${leagueName}`}
                    </p>
                </div>

                {/* Toggle for site admins */}
                {isSiteAdmin && (
                    <button
                        onClick={() => setShowAddUser(true)}
                        className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                    >
                        + Add User
                    </button>
                )}

                {/* Toggle for site admins */}
                {isSiteAdmin && (
                    <button
                        onClick={() => setShowAllUsers(prev => !prev)}
                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            showAllUsers
                                ? 'bg-green-900 border-green-700 text-green-400'
                                : 'border-gray-700 text-gray-400 hover:text-whtie hover-border-gray-600'
                        }`}
                    >
                        {showAllUsers ? 'League View' : 'All Users'}
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* League Members Table */}
            {!showAllUsers && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-800 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        <div className="col-span-3">Username</div>
                        <div className="col-span-4">Email</div>
                        <div className="col-span-2">Team</div>
                        <div className="col-span-1">Role</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {leagueMembers.map(member => (
                        <div
                            key={member.id}
                            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 last:border-0 items-center hover:bg-gray-800/30 transition-colors"
                        >
                            <div className="col-span-3">
                                <p className="text-sm font-medium text-white">
                                    {member.user.username}
                                </p>
                                {member.user.id === currentUserId && (
                                    <span className="text-xs text-green-500">You</span>
                                )}
                            </div>
                            <div className="col-span-4">
                                <p className="text-sm text-gray-400 truncate">{member.user.email}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400 truncate">
                                    {member.user.fantasyTeams[0]?.name ?? '-'}
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
                            <div className="col-span-2 flex justify-end">
                                {member.user.id !== currentUserId && (
                                    <button
                                        onClick={() => handleRemoveFromLeague(member)}
                                        className="text-xs px-3 py-1.5 rounded-log bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* All Users Table - Site Admin Only */}
            {showAllUsers && isSiteAdmin && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-800 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        <div className="col-span-3">Username</div>
                        <div className="col-span-3">Email</div>
                        <div className="col-span-2">League</div>
                        <div className="col-span-1">Role</div>
                        <div className="col-span-3 text-right">Actions</div>
                    </div>

                    {allUsers.map(user => (
                        <div
                            key={user.id}
                            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 last:border-0 items-center hover:bg-gray-800/30 transition-colors"
                        >
                            <div className="col-span-3">
                                <p className="text-sm font-medium text-white">{user.username}</p>
                                {user.id === currentUserId && (
                                    <span className="text-xs text-green-500">You</span>
                                )}
                            </div>
                            <div className="col-span-3">
                                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400 truncate">
                                    {user.leagues[0]?.fantasyLeague.name ?? '-'}
                                </p>
                            </div>
                            <div className="col-span-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    user.isSiteAdmin
                                        ? 'bg-green-900 text-green-400'
                                        : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {user.isSiteAdmin ? 'SiteAdmin' : 'User'}
                                </span>
                            </div>
                            <div className="col-span-3 flex justify-end gap-2">
                                {user.id !== currentUserId && (
                                    <>
                                    <button
                                        onClick={() => handleToggleSiteAdmin(user)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                                    >
                                        {user.isSiteAdmin ? 'Remove admin' : 'Make admin'}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveFromSite(user)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                                    >
                                        Delete
                                    </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
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

            {/* Add User Modal */}
            {showAddUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-base font-medium text-white mb-1">Add User</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            The user will be added to the allow list and sent an invite email.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Username
                            </label>
                            <input 
                                type="text"
                                value={addUserForm.username}
                                onChange={e => setAddUserForm(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="johndoe"
                                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Email Address
                            </label>
                            <input 
                                type="text"
                                value={addUserForm.email}
                                onChange={e => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="johndoe@example.com"
                                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600"
                            />
                        </div>

                        {/* Error */}
                        {addUserError && (
                            <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                                {addUserError}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            onClick={() => {
                                setShowAddUser(false)
                                setAddUserForm({ email: '', username: ''})
                                setAddUserError(null)
                            }}
                            disabled={addUserLoading}
                            className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddUser}
                            disabled={addUserLoading}
                            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green=600 transition-colors disabled:opacity-50 font-medium"
                        >
                            {addUserLoading ? 'Adding...' : 'Add User' }
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}