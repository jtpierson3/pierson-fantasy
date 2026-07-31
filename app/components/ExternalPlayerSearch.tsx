'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { isPremierLeagueEligible } from '@/lib/playerEligibility'

type SearchResult = {
    id: number
    display_name: string
    image_path: string | null
    team: { id: number; name: string; image_path: string | null; leagueId?: number } | null
}

type Props = {
    onSelect: (player: SearchResult) => void
}

export default function ExternalPlayerSearch({ onSelect }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searched, setSearched] = useState(false)

    const handleSearch = useCallback(async () => {
        if (query.trim().length < 2) return
        setSearching(true)
        setError(null)
        setSearched(true)
        try {
            const res = await fetch(`/api/waivers/search-any-player?q=${encodeURIComponent(query.trim())}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Search failed')
            setResults(data.players ?? [])
        } catch (err) {
            setError(err instanceof Error ? err.message: 'Search failed')
            setResults([])
        } finally {
            setSearching(false)
        }
    }, [query])

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="text-sm text-blue-700 hover:text-blue-800 font-medium underline"
            >
                Can&apos;t find them? Search players in other leagues
            </button>
        )
    }

    return (
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3">
                Search for a player who isn&apos;t currently in a tracked league (e.g. rumored transfers) 
            </p>
            
            <div className="flex gap-2 mb-3">
                <input 
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search player name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
                <button
                    onClick={handleSearch}
                    disabled={searching || query.trim.length < 4}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                >
                    {searching ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    {error}
                </p>
            )}

            {searched && !searching && !error && results.length === 0 && (
                <p className="text-xs text-gray-400">No players found for that search</p>
            )}

            {results.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {results.map(player => {
                        const eligible = isPremierLeagueEligible(player.team?.leagueId)
                        return ( 
                            <button
                                key={player.id}
                                onClick={() => onSelect(player)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                    eligible
                                        ? 'bg-white hover:bg-gray-100 border border-gray-100'
                                        : 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                <div className="relative w-7 h-7 rounded-full oveflow-hidden flex-shrink-0 bg-gray-100">
                                    {player.image_path && (
                                        <Image src={player.image_path} alt={player.display_name} fill className="object-contain" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{player.display_name}</p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {player.team?.name ?? 'No Club'}
                                        {!eligible && <span className="text-amber-600 ml-1">- NA</span>}
                                    </p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}