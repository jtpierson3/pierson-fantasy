'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type PlayerOption = { id: number; name: string; teamName: string | null }
type Entry = {
    id: string
    source: 'SPORTMONKS' | 'MANUAL'
    playerId: number
    playerName: string
    playerImage: string | null
    teamName: string | null
    category: string
    typeName: string
    startDate: string
    endDate: string | null
}

type Props = {
    players: PlayerOption[]
    entries: Entry[]
}

const CATEGORIES = ['injury', 'suspended'] as const

function toDateInput(iso: string | null): string {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 10)
}

export default function SidelinedManager({ players, entries }: Props) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // add form
    const [query, setQuery] = useState('')
    const [playerId, setPlayerId] = useState<number | null>(null)
    const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('injury')
    const [typeName, setTypeName] = useState('')
    const [startDate, setStartDate] = useState(toDateInput(new Date().toISOString()))
    const [endDate, setEndDate] = useState('')

    // inline edit
    const [editId, setEditId] = useState<string | null>(null)
    const [editState, setEditState] = useState<{ category: string; typeName: string; startDate: string; endDate: string }>({
        category: 'injury', typeName: '', startDate: '', endDate: '',
    })

    const [openTeams, setOpenTeams] = useState<Set<string>>(new Set())

    const activePlayerIds = useMemo(
        () => new Set(entries.map(e => e.playerId)),
        [entries],
    )

    const groupedByTeam = useMemo(() => {
        const groups = new Map<string, Entry[]>()
        for (const e of entries) {
            const key = e.teamName ?? 'Unknown club'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(e)
        }
        return[...groups.entries()]
            .map(([teamName, list]) => ({
                teamName,
                list: list.sort((a, b) => a.playerName.localeCompare(b.playerName)),
            }))
            .sort((a, b) => a.teamName.localeCompare(b.teamName))
    }, [entries])

    const toggleTeam = (name: string) => 
        setOpenTeams(prev => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        return players
            .filter(p => p.name.toLowerCase().includes(q) && !activePlayerIds.has(p.id))
            .slice(0, 8)
    }, [query, players, activePlayerIds])

    const call = useCallback(async (path: string, body: unknown, tag: string) => {
        setBusy(tag)
        setError(null)
        try {
            const res = await fetch(`/api/admin/sidelined/${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Request failed')
                return false
            }
            router.refresh()
            return true
        } catch {
            setError('Request failed')
            return false
        } finally {
            setBusy(null)
        }
    }, [router])

    const submitAdd = async () => {
        if (!playerId || !typeName.trim() || !startDate) {
            setError('Player, type, and start date are required')
            return
        }
        const ok = await call('create', {
            playerId,
            category,
            typeName: typeName.trim(),
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
        }, 'add')
        if (ok) {
            setQuery(''); setPlayerId(null); setTypeName(''); setEndDate('')
            setStartDate(toDateInput(new Date().toISOString())); setCategory('injury')
        }
    }

    const startEdit = (e: Entry) => {
        setEditId(e.id)
        setEditState({
            category: e.category,
            typeName: e.typeName,
            startDate: toDateInput(e.startDate),
            endDate: toDateInput(e.endDate),
        })
    }

    const submitEdit = async (id: string) => {
        const ok = await call('update', {
            id,
            category: editState.category,
            typeName: editState.typeName.trim(),
            startDate: new Date(editState.startDate).toISOString(),
            endDate: editState.endDate ? new Date(editState.endDate).toISOString() : null,
        }, `edit-${id}`)
        if (ok) setEditId(null)
    }

    const selectedPlayer = players.find(p => p.id === playerId) ?? null

    return (
        <div className="space-y-8 text-gray-100">
            <div>
                <h1 className="text-lg font-medium text-white">Sidelined</h1>
                <p className="text-sm text-gray-400">
                    Add injuries or suspensions Sportmonks is missing. If Sportmonks later picks a
                    player up, the manual entry is promoted automatically and managed by the sync from then on.
                </p>
            </div>

            {error && (
                <div className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* Add form */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
                <h2 className="text-sm font-medium text-white">Add entry</h2>

                <div className="relative">
                    <label className="block text-xs text-gray-400 mb-1">Player</label>
                    {selectedPlayer ? (
                        <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
                            <span>{selectedPlayer.name}{selectedPlayer.teamName ? ` — ${selectedPlayer.teamName}` : ''}</span>
                            <button onClick={() => { setPlayerId(null); setQuery('') }} className="text-xs text-gray-400 hover:text-white">
                                change
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search player…"
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                            />
                            {matches.length > 0 && (
                                <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
                                    {matches.map(m => (
                                        <li key={m.id}>
                                            <button
                                                onClick={() => { setPlayerId(m.id); setQuery('') }}
                                                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                                            >
                                                {m.name}{m.teamName ? ` — ${m.teamName}` : ''}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'suspended' ? 'Suspended' : 'Injured'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Type / reason</label>
                        <input
                            value={typeName}
                            onChange={e => setTypeName(e.target.value)}
                            placeholder="e.g. Hamstring Injury"
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Start date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Expected return (optional)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
                    </div>
                </div>

                <button
                    onClick={submitAdd}
                    disabled={busy === 'add'}
                    className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                    {busy === 'add' ? 'Adding…' : 'Add entry'}
                </button>
            </div>

            {/* Sidelined by team */}
            <div className="space-y-2">
                {groupedByTeam.length === 0 && (
                    <p className="text-sm text-gray-500">No players currently sidelined.</p>
                )}
                {groupedByTeam.map(({ teamName, list }) => {
                    const open = openTeams.has(teamName)
                    return (
                        <div key={teamName} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
                            <button
                                onClick={() => toggleTeam(teamName)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50"
                            >
                                <span className="text-sm font-medium text-white">{teamName}</span>
                                <span className="flex items-center gap-2">
                                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                                        {list.length}
                                    </span>
                                    <svg
                                        className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
                                        viewBox="0 0 20 20" fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </button>

                            {open && (
                                <div className="divide-y divide-gray-800 border-t border-gray-800">
                                    {list.map(e => (
                                        <div key={e.id} className="p-3">
                                            {editId === e.id ? (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-white">{e.playerName}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select value={editState.category}
                                                            onChange={ev => setEditState(s => ({ ...s, category: ev.target.value }))}
                                                            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm">
                                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <input value={editState.typeName}
                                                            onChange={ev => setEditState(s => ({ ...s, typeName: ev.target.value }))}
                                                            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm" />
                                                        <input type="date" value={editState.startDate}
                                                            onChange={ev => setEditState(s => ({ ...s, startDate: ev.target.value }))}
                                                            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm" />
                                                        <input type="date" value={editState.endDate}
                                                            onChange={ev => setEditState(s => ({ ...s, endDate: ev.target.value }))}
                                                            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => submitEdit(e.id)} disabled={busy === `edit-${e.id}`}
                                                            className="rounded-md bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-600 disabled:opacity-50">
                                                            Save
                                                        </button>
                                                        <button onClick={() => setEditId(null)}
                                                            className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-800">
                                                        {e.playerImage && <Image src={e.playerImage} alt={e.playerName} fill className="object-contain" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                                                            {e.playerName}
                                                            {e.source === 'MANUAL' && (
                                                                <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                                                    Manual
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {e.category} · {e.typeName} · since {new Date(e.startDate).toLocaleDateString()}
                                                            {e.endDate ? ` · exp. ${new Date(e.endDate).toLocaleDateString()}` : ''}
                                                        </p>
                                                    </div>
                                                    {e.source === 'MANUAL' && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => startEdit(e)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                                                            <button onClick={() => call('resolve', { id: e.id }, `resolve-${e.id}`)}
                                                                disabled={busy === `resolve-${e.id}`}
                                                                className="text-xs text-gray-400 hover:text-white disabled:opacity-50">Resolve</button>
                                                            <button onClick={() => call('delete', { id: e.id }, `delete-${e.id}`)}
                                                                disabled={busy === `delete-${e.id}`}
                                                                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}