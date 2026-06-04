'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import ProfileTab from './ProfileTab'
import SeasonTab from './SeasonTab'

type PlayerWithDetails = Prisma.SurvivorPlayerGetPayload<{
  include: {
    contestants: {
      include: {
        survivorSeason: true
        tribeMemberships: { include: { tribe: true } }
        challengeResults: {
          include: {
            challenge: { include: { episode: true, survivorChallenge: true } }
          }
        }
        sitOuts: {
          include: {
            challenge: { include: { episode: true } }
          }
        }
        votesReceived: {
          where: { isRevoked: false }
          include: {
            voter: { include: { survivorPlayer: true } }
            tribalCouncil: { include: { episode: true } }
          }
        }
        votesGiven: {
          include: {
            votedFor: { include: { survivorPlayer: true } }
            tribalCouncil: { include: { episode: true } }
          }
        }
        episodeStats: {
          include: {
            event: true
            episode: true
          }
        }
      }
    }
  }
}>

type Props = {
  player: PlayerWithDetails
}

function formatBirthDate(date: Date): string {
  const now = new Date()
  const age = now.getFullYear() - date.getFullYear()
  const m = now.getMonth() - date.getMonth()
  const adjustedAge = m < 0 || (m === 0 && now.getDate() < date.getDate()) ? age - 1 : age
  return `${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })} (age ${adjustedAge})`
}

export default function PlayerWiki({ player }: Props) {
  const [activeTab, setActiveTab] = useState<string>('profile')

  const mostRecent = player.contestants[0]
  const tribe = mostRecent?.tribeMemberships.find(m => m.isCurrent)?.tribe

  // Career stats
  const totalDays = player.contestants.reduce((sum, c) => sum + (c.daysLasted ?? 0), 0)
  const totalChallengeWins = player.contestants.reduce((sum, c) =>
    sum + c.challengeResults.filter(r => r.placement === 1).length, 0
  )
  const totalVotesAgainst = player.contestants.reduce((sum, c) =>
    sum + c.votesReceived.length, 0
  )

  // Season name string
  const seasonNames = player.contestants.map(c =>
    c.survivorSeason.theme ?? c.survivorSeason.title
  )
  const seasonString = seasonNames.length === 1
    ? seasonNames[0]
    : seasonNames.length === 2
    ? `${seasonNames[0]} and ${seasonNames[1]}`
    : `${seasonNames.slice(0, -1).join(', ')} and ${seasonNames[seasonNames.length - 1]}`

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/survivor/players" className="hover:text-gray-600 transition-colors">
          Players
        </Link>
        <span>/</span>
        <span className="text-gray-900">{player.name}</span>
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-8">
        {/* Left — name and bio */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            {player.name}
          </h1>
          <p className="text-base text-gray-500 mb-4">{seasonString}</p>
          {player.bio && (
            <p className="text-sm text-gray-600 leading-relaxed">{player.bio}</p>
          )}
        </div>

        {/* Right — stats panel */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {/* Photo */}
            <div className="relative w-full aspect-square bg-gray-200">
              {mostRecent?.imageUrl ? (
                <Image
                  src={mostRecent.imageUrl}
                  alt={player.name}
                  fill
                  className="object-cover object-[center_top]"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: tribe?.color ?? '#e5e7eb' }}
                >
                  <span className="text-5xl text-white/60 font-medium">
                    {player.name[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 flex-shrink-0">Seasons</span>
                <span className="text-gray-900 font-medium">
                  {player.contestants.length}
                </span>
              </div>

              {player.birthDate && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Born</span>
                  <span className="text-gray-900 font-medium text-right">
                    {formatBirthDate(new Date(player.birthDate))}
                  </span>
                </div>
              )}

              {mostRecent?.hometown && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">From</span>
                  <span className="text-gray-900 font-medium text-right">
                    {mostRecent.hometown}
                  </span>
                </div>
              )}

              {mostRecent?.occupation && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Job</span>
                  <span className="text-gray-900 font-medium text-right">
                    {mostRecent.occupation}
                  </span>
                </div>
              )}

              {/* Career stats */}
              <div className="pt-1 border-t border-gray-200">
                <p
                  className="text-gray-400 mb-1.5 uppercase tracking-wide"
                  style={{ fontSize: '10px' }}
                >
                  Career Stats
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Total days</span>
                    <span className="text-gray-900 font-medium">{totalDays}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Challenge wins</span>
                    <span className="text-gray-900 font-medium">{totalChallengeWins}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Votes against</span>
                    <span className="text-gray-900 font-medium">{totalVotesAgainst}</span>
                  </div>
                </div>
              </div>

              {/* Per season results */}
              <div className="pt-1 border-t border-gray-200">
                {player.contestants.map(c => {
                  const finish = c.status === 'winner'
                    ? 'Sole Survivor'
                    : c.status === 'finalist'
                    ? 'Runner-Up'
                    : c.placement
                    ? `${c.placement}/${c.survivorSeason.castawayCount ?? '?'}`
                    : null
                  return (
                    <div key={c.id} className="flex justify-between gap-2 mb-1">
                      <Link
                        href={`/survivor/seasons/${c.survivorSeason.id}`}
                        className="text-green-700 hover:text-green-800 transition-colors truncate"
                      >
                        S{c.survivorSeason.number}
                      </Link>
                      {finish && (
                        <span className={`font-medium text-right ${
                          c.status === 'winner' ? 'text-yellow-600' :
                          c.status === 'finalist' ? 'text-purple-600' :
                          'text-gray-600'
                        }`}>
                          {finish}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
            activeTab === 'profile'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Profile
        </button>
        {player.contestants.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
              activeTab === c.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {c.survivorSeason.title}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        {activeTab === 'profile' && (
            <ProfileTab player={player} />
        )}
        {player.contestants.map(c =>
          activeTab === c.id ? (
            <SeasonTab key={c.id} contestant={c} player={player} />
          ) : null
        )}
      </div>
    </div>
  )
}