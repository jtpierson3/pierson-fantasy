'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FantasyTeamWithPlayers, TargetGameweek } from './types'
import LatestLineup from './latestLineup'
import TeamStats from './teamStats'
import SetLineup from './setLineup'
import WaiversTab from './waiversTab'
import { ClaimStatus } from './waiversTab'


type Tab = 'lineup' | 'performance' | 'set-lineup' | 'waivers'

const TABS: { id: Tab; label: string } [] = [
    { id: 'lineup', label: 'Latest Lineup'},
    { id: 'performance', label: 'Team Stats' },
    { id: 'set-lineup', label: 'Set Lineup'},
    { id: 'waivers', label: 'Waivers' }
]

type Props = {
    fantasyTeam: FantasyTeamWithPlayers
    myClaims: ClaimStatus[]
    targetGameweek: TargetGameweek
    targetGameweekLockTime: string | null
}

export default function MyTeam({ fantasyTeam, myClaims, targetGameweek, targetGameweekLockTime }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialTab = (searchParams.get('tab') as Tab) ?? 'lineup'
    const [activeTab, setActiveTab] = useState<Tab>(initialTab)
    const [team, setTeam] = useState(fantasyTeam)

    const [isEditingName, setIsEditingName] = useState(false)
    const [nameInput, setNameInput] = useState(team.name)
    const [savingName, setSavingName] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)

    const handleSaveName = useCallback(async () => {
        if (!nameInput.trim()) {
            setNameError('Team name is required')
            return
        }
        setSavingName(true)
        setNameError(null)
        try {
            const res = await fetch('/api/my-team/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fantasyTeamId: team.id, name: nameInput })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to rename team')
            setTeam(prev => ({ ...prev, name: nameInput.trim() }))
            setIsEditingName(false)
            router.refresh()
        } catch (err) {
            setNameError(err instanceof Error ? err.message : 'Failed to rename team')
        } finally {
            setSavingName(false)
        }
    }, [nameInput, team.id, router])

    return(
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                            autoFocus
                            className="text-xl font-medium text-gray-900 border-b-2 border-green-600 focus:outline-none bg-transparent"
                        />
                        <button
                            onClick={handleSaveName}
                            disabled={savingName}
                            className="px-3 py-1 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transtition-colors disabled:opacity-50"
                        >
                            {savingName ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditingName(false)
                                setNameInput(team.name)
                                setNameError(null)
                            }}
                            className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-medium text-gray-900">{team.name}</h1>
                        <button
                            onClick={() => setIsEditingName(true)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Rename team"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                )}
                {nameError && (
                    <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{team.fantasyLeague.name}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                            activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'lineup' && <LatestLineup team={team} />}
            {activeTab === 'performance' && <TeamStats team={team} />}
            {activeTab === 'set-lineup' && (
                <SetLineup 
                    team={team} 
                    onUpdate={setTeam}
                    targetGameweek={targetGameweek}
                    targetGameweekLockTime={targetGameweekLockTime}
                />
            )}
            {activeTab === 'waivers' && <WaiversTab team={team} initialClaims={myClaims} />}
        </div>
    )
}