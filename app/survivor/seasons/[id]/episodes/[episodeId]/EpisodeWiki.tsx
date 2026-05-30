'use client'

import StoryTab from './StoryTab'
import ScoringTab from './ScoringTab'
import ChallengesTab from './ChallengesTab'
import TribalTab from './TribalTab'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import type { EpisodeWithDetails } from './types'
import { getContestantTribe } from '@/app/lib/survivorHelpers'

type Props = {
    episode: EpisodeWithDetails
}

type Tab = 'story' | 'scoring' | 'challenges' | 'tribal'

const TABS: { id: Tab; label: string }[] = [
    { id: 'story', label: 'Story' },
    { id: 'scoring', label: 'Scoring' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'tribal', label: 'Tribal Council' },
]

export default function EpisodeWiki({ episode }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('story')

    const season = episode.survivorSeason
    const episodes = season.episodes
    const currentIndex = episodes.findIndex(e => e.id === episode.id)
    const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null
    const nextEpisode = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null

    return (
        <div className="flex gap-6 p-6 max-w-7xl mx-auto">
            {/* Left sidebar - episode navigation */}
            <div className="w-48 flex-shrink-0">
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden sticky top-6">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Episodes</p>
                    </div>
                    <div className="divide-y divide-gray-50 max-h[calc(100vh-200px)] overflow-y-auto">
                        {episodes.map(ep => (
                            <Link
                                key={ep.id}
                                href={`/survivor/seasons/${season.id}/episodes/${ep.id}`}
                                className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                                    ep.id === episode.id
                                        ? 'bg-green-50 text-green-800 font-medium'
                                        : ep.isAired
                                        ? 'text-gray-600 hover:bg-gray-50'
                                        : 'text-gray-400 hover:bg-gray-50'
                                }`}
                            >
                                <span className="w-5 text-center flex-shrink-0 text-gray-400">
                                    {ep.number}
                                </span>
                                <span className="truncate">{ep.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/*Main Content */}
            <div className="flex-1 min-w-0">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                    <Link href="/survivor/seasons" className="hover:text-gray-600 transition-colors">
                        Seasons
                    </Link>
                    <span>/</span>
                    <Link
                        href={`/survivor/seasons/${season.id}`}
                        className="hover:text-gray-600 transition-colors"
                    >
                        Season { season.number }
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900">Episode {episode.number}</span>
                </div>

                {/* Header - same style as player bio and season */}
                <div className="flex gap-6 mb-8">
                    {/* Left - title and description */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-medium text-gray-900 mb-1">
                            {episode.name}
                        </h1>
                        <p className="text-base text-gray-500 mb-4">
                            Episode {episode.number} of {season.title}
                        </p>

                        <div className="flex gap-2 mb-4 flex-wrap">
                            {episode.isMerge && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                    Merge Episode
                                </span>
                            )}
                            {episode.isFinale && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                                    Finale
                                </span>
                            )}
                            {!episode.isAired && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                                    Upcoming
                                </span>
                            )}
                        </div>

                        {episode.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {episode.description}
                            </p>
                        )}
                    </div>

                    {/* Right - stats panel */}
                    <div className="w-56 flex-shrink-0">
                        <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                            <div className="p-3 flex flex-col gap-2 text-xs">
                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400 flex-shrink-0">Season</span>
                                    <Link
                                        href={`/survivor/seasons/${season.id}`}
                                        className="text-green-700 hover:text-green-800 font-medium text-right transition-colors"
                                    >
                                        {season.title}
                                    </Link>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400 flex-shrink-0">Episode</span>
                                    <span className="text-gray-900 font-medium">{episode.number}</span>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-400 flex-shrink-0">Air Date</span>
                                    <span className="text-gray-900 font-medium text-right">
                                        {new Date(episode.airDate).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>

                                {/* Challenge Winners */}
                                {episode.challenges.length > 0 && (
                                    <div className="pt-1 border-t border-gray-200">
                                        {episode.challenges.map(challenge => {
                                            const winner = challenge.results.find(r => r.placement === 1)
                                            const winnerName= winner?.contestant?.survivorPlayer.name.split(' ')[0]
                                                ?? winner?.team?.name
                                                ?? null
                                            const winnerTribe = winner?.contestant
                                                ? getContestantTribe(winner.contestant)
                                                : winner?.team
                                                ? { color: winner.team.color ?? '#6b7280', name: winner.team.name ?? 'Team' }
                                                : null
                                            
                                            if (!winnerName) return null
                                            return (
                                                <div key={challenge.id} className="flex justify-between gap-2 mb-1">
                                                    <span className="text-gray-400 flex-shrink-0 capitalize">
                                                        {challenge.type === 'combined' ? 'Reward + Immunity' : challenge.type}
                                                    </span>
                                                    <span
                                                        className="font-medium text-right px-1.5 py-0.5 rounded text-white"
                                                        style={{ backgroundColor: winnerTribe?.color ?? '#6b7280'}}
                                                    >
                                                        {winnerName}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Eliminated */}
                                {episode.tribalCouncils.filter(tc => tc.eliminated).length > 0 && (
                                    <div className="pt-1 border-t border-gray-200">
                                        {episode.tribalCouncils
                                            .filter(tc => tc.eliminated)
                                            .map(tc => {
                                                const tribe = tc.eliminated
                                                    ? getContestantTribe(tc.eliminated)
                                                    : null

                                                return(
                                                    <div key={tc.id} className="flex justify-between gap-2 mb-1">
                                                        <span className="text-gray-400 flex-shrink-0">Eliminated</span>
                                                        <Link
                                                            href={`/survivor/players/${tc.eliminated?.survivorPlayerId}`}
                                                            className="font-medium text-right px-1.5 py-0.5 rounded text-white transition-opacity hover:opacity-80"
                                                            style={{ backgroundColor: tribe?.color ?? '#6b7280'}}
                                                        >
                                                            {tc.eliminated?.survivorPlayer.name.split(' ')[0]}
                                                        </Link>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                )}

                                {/* PREV/NEXT/NAVIGATION*/}
                                <div className="pt-1 border-t border-gray-200 flex justify-between">
                                    {prevEpisode ? (
                                        <Link
                                            href={`/survivor/seasons/${season.id}/episodes/${prevEpisode.id}`}
                                            className="text-green-700 hover:text-green-800 transition-colors"
                                        >
                                            Ep {prevEpisode.number}
                                        </Link>
                                    ): <span /> }
                                    {nextEpisode ? (
                                        <Link
                                            href={`/survivor/seasons/${season.id}/episodes/${nextEpisode.id}`}
                                            className="text-green-700 hover:text-green-800 transition-colors"
                                        >
                                            Ep {nextEpisode.number}
                                        </Link>
                                    ): <span /> }
                                </div>
                            </div>
                        </div>
                    </div>
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

                {/* TAB ROW */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 overflow-hidden">
                    {activeTab === 'story' && <StoryTab episode={episode} />}
                    {activeTab === 'scoring' && <ScoringTab episode={episode} />}
                    {activeTab === 'challenges' && <ChallengesTab episode={episode} />}
                    {activeTab === 'tribal' && <TribalTab episode={episode} />}
                </div>
            </div>    
        </div>
    )
}