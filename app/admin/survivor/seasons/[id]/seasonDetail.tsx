'use client'

import { useState } from 'react'
import ContestantsTab from './contestantsTab'
import TribesTab from './tribesTab'
import EpisodesTab from './episodesTab'
import ScoringTab from './scoringTab'
import Link from 'next/link'
import { Prisma } from '@prisma/client'

type Tab = 'contestants' | 'tribes' | 'episodes' | 'scoring'

const TABS: { id: Tab; label: string }[] = [
    { id: 'contestants', label: 'Contestants' },
    { id: 'tribes', label: 'Tribes' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'scoring', label: 'Scoring' }
]

type Props = {
  season: Prisma.SurvivorSeasonGetPayload<{
    include: {
      contestants: {
        include: {
          survivorPlayer: true
          tribeMemberships: {
            include: { tribe: true }
          }
        }
      }
      tribes: true
      episodes: true
      scoringEvents: true
    }
  }>
  allPlayers: { id: string; name: string; imageUrl: string | null }[]
}

export default function SeasonDetail({ season, allPlayers }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('contestants')

    return(
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/admin/survivor/seasons"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    Back to Seasons
                </Link>
                <span className="text-gray-700">/</span>
                <div>
                    <h1 className="text-xl font-medium text-white">
                        Season {season.number} - {season.title}
                    </h1>
                    {season.theme && (
                        <p className="text-sm text-gray-400 mt-0.5">{season.theme}</p>
                    )}
                </div>
                {season.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400 border border-green-700 font-medium">
                        Active
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                            activeTab === tab.id
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'contestants' && (
                <ContestantsTab season={season} allPlayers={allPlayers} />
            )} 
            {activeTab === 'tribes' && <TribesTab season={season} />}
            {activeTab === 'episodes' && <EpisodesTab season={season} />}
            {activeTab === 'scoring' && <ScoringTab season={season} />}
        </div>
    )
}