'use client'

import { useState } from 'react'
import type { FantasyTeamWithPlayers } from './types'
import LatestLineup from './latestLineup'
import TeamStats from './teamStats'
import SetLineup from './setLineup'

type Tab = 'lineup' | 'performance' | 'set-lineup'

const TABS: { id: Tab; label: string } [] = [
    { id: 'lineup', label: 'Latest Lineup'},
    { id: 'performance', label: 'Team Stats' },
    { id: 'set-lineup', label: 'Set Lineup'}
]

type Props = {
    fantasyTeam: FantasyTeamWithPlayers
}

export default function MyTeam({ fantasyTeam }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('lineup')
    const [team, setTeam] = useState(fantasyTeam)

    return(
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-medium text-gray-900">{team.name}</h1>
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
            {activeTab === 'performance' && <TeamStats team={team}  onUpdate={setTeam} />}
            {activeTab === 'set-lineup' && <SetLineup team={team} onUpdate={setTeam}/>}
        </div>
    )
}