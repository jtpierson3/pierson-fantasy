'use client'

import { useState } from 'react'
import Link from 'next/link'
import ChallengesTab from './challengesTab'
import TribalCouncilTab from './tribalCouncilTab'
import ScoringTab from './scoringTab'

type Tab = 'overview' | 'challenges' | 'tribal' | 'scoring'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'tribal', label: 'Tribal Council' },
  { id: 'scoring', label: 'Scoring' },
]

type Props = {
  episode: any
  contestants: any[]
  scoringEvents: any[]
}

export default function EpisodeDetail({ episode, contestants, scoringEvents }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/survivor/seasons" className="text-gray-400 hover:text-white transition-colors">
          Seasons
        </Link>
        <span className="text-gray-700">/</span>
        <Link
          href={`/admin/survivor/seasons/${episode.survivorSeasonId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Season {episode.survivorSeason.number}
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-white">Episode {episode.number}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">
            Episode {episode.number} — {episode.name}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date(episode.airDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {episode.isAired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              Aired
            </span>
          )}
          {episode.isMerge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-400 border border-blue-700">
              Merge
            </span>
          )}
          {episode.isFinale && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-400 border border-yellow-700">
              Finale
            </span>
          )}
        </div>
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

      {/* Tab content */}
      {activeTab === 'overview' && (
        <EpisodeOverview
          episode={episode}
          contestants={contestants}
          scoringEvents={scoringEvents}
        />
      )}
      {activeTab === 'challenges' && (
        <ChallengesTab episode={episode} contestants={contestants} />
      )}
      {activeTab === 'tribal' && (
        <TribalCouncilTab episode={episode} contestants={contestants} />
      )}
      {activeTab === 'scoring' && (
        <ScoringTab
          episode={episode}
          contestants={contestants}
          scoringEvents={scoringEvents}
        />
      )}
    </div>
  )
}

function EpisodeOverview({ episode, contestants, scoringEvents }: Props) {
  const totalStats = episode.stats.length
  const totalPoints = episode.stats.reduce((sum: number, s: any) => sum + s.event.points, 0)
  const contestantsScored = new Set(episode.stats.map((s: any) => s.contestantId)).size

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Stats summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Episode Summary</p>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Scoring entries</span>
            <span className="text-sm font-medium text-white">{totalStats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Contestants scored</span>
            <span className="text-sm font-medium text-white">{contestantsScored}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Challenges</span>
            <span className="text-sm font-medium text-white">{episode.challenges.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Tribal councils</span>
            <span className="text-sm font-medium text-white">{episode.tribalCouncils.length}</span>
          </div>
        </div>
      </div>

      {/* Top scorers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Top Scorers</p>
        {episode.stats.length === 0 ? (
          <p className="text-sm text-gray-500">No scoring entered yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(
              episode.stats.reduce((acc: Record<string, { name: string; points: number }>, s: any) => {
                const id = s.contestantId
                if (!acc[id]) acc[id] = { name: s.contestant.survivorPlayer.name, points: 0 }
                acc[id].points += s.event.points
                return acc
              }, {})
            )
              .sort(([, a]: any, [, b]: any) => b.points - a.points)
              .slice(0, 5)
              .map(([id, data]: any) => (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-sm text-gray-300 truncate">{data.name}</span>
                  <span className="text-sm font-medium text-green-400">+{data.points}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Eliminated */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Eliminated</p>
        {episode.tribalCouncils.filter((t: any) => t.eliminated).length === 0 ? (
          <p className="text-sm text-gray-500">No eliminations recorded</p>
        ) : (
          <div className="flex flex-col gap-2">
            {episode.tribalCouncils
              .filter((t: any) => t.eliminated)
              .map((t: any) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900 text-red-400 border border-red-700">
                    {t.isFiremaking ? 'Firemaking' : `TC ${t.order}`}
                  </span>
                  <span className="text-sm text-white">
                    {t.eliminated.survivorPlayer.name}
                  </span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}