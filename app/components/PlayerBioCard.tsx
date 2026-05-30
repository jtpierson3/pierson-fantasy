'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { Prisma } from '@prisma/client'
import FormattedText from './FormattedText'

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    survivorSeason: true
    tribeMemberships: {
      include: { tribe: true }
    }
    challengeResults: {
      where: { placement: 1 }
      include: { challenge: true }
    }
    votesReceived: {
      where: { isRevoked: false }
    }
    episodeStats: {
      include: { event: true }
    }
  }
}>

type SurvivorPlayer = {
  id: string
  name: string
  bio: string | null
  birthDate: Date | null
}

type Props = {
  player: SurvivorPlayer
  contestants: ContestantWithDetails[]
  featuredContestantId?: string
}

function formatBirthDate(date: Date): string {
  const now = new Date()
  const age = now.getFullYear() - date.getFullYear()
  const formatted = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatted} (age ${age})`
}

function SeasonAccordion({ contestant }: { contestant: ContestantWithDetails }) {
  const [open, setOpen] = useState(false)
  const tribes = contestant.tribeMemberships.map(m => m.tribe)
  const challengeWins = contestant.challengeResults.length
  const votesAgainst = contestant.votesReceived.length
  const season = contestant.survivorSeason

  const finishLabel = contestant.placement && season.castawayCount
    ? `${contestant.placement}/${season.castawayCount}`
    : contestant.placement
    ? `${contestant.placement}`
    : '—'

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">
            Season {season.number}
          </p>
          <p className="text-xs text-gray-400">
            {season.theme ?? season.title}
          </p>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {open && (
        <div className="px-3 py-3 flex flex-col gap-3">
          {/* Tribes */}
          {tribes.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Tribes</p>
              <div className="flex flex-wrap gap-1.5">
                {tribes.map(tribe => (
                  <span
                    key={tribe.id}
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: tribe.color }}
                  >
                    {tribe.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-medium text-gray-900">{finishLabel}</p>
              <p className="text-xs text-gray-400">Finish</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-medium text-gray-900">
                {contestant.daysLasted ?? '—'}
              </p>
              <p className="text-xs text-gray-400">Days lasted</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-medium text-gray-900">{challengeWins}</p>
              <p className="text-xs text-gray-400">Challenge wins</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-sm font-medium text-gray-900">{votesAgainst}</p>
              <p className="text-xs text-gray-400">Votes against</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlayerBioCard({ player, contestants, featuredContestantId }: Props) {
  const featuredContestant = featuredContestantId
    ? contestants.find(c => c.id === featuredContestantId)
    : contestants[0]

  // Build season list string e.g. "Pearl Islands and Heroes vs Villains"
  const seasonNames = contestants.map(c =>
    c.survivorSeason.theme ?? c.survivorSeason.title
  )
  const seasonString = seasonNames.length === 1
    ? seasonNames[0]
    : seasonNames.length === 2
    ? `${seasonNames[0]} and ${seasonNames[1]}`
    : `${seasonNames.slice(0, -1).join(', ')} and ${seasonNames[seasonNames.length - 1]}`

  return (
    <div className="flex gap-6">
      {/* Left 2/3 — Bio text */}
      <div className="flex-1 min-w-0">
        {/* Intro sentence */}
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          <span className="font-medium text-gray-900">{player.name}</span>
          {' '}is a contestant from{' '}
          <span className="font-medium text-gray-900">{seasonString}</span>.
        </p>

        {/* Player bio */}
        {player.bio && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {player.bio}
          </p>
        )}

        {/* Featured season profile */}
        {featuredContestant?.profile && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Preseason Profile
            </p>
            <FormattedText
              text={featuredContestant.profile}
              className="text-sm text-gray-600 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Right 1/3 — Side panel */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
          {/* Season image */}
          <div className="relative w-full aspect-square bg-gray-200">
            {featuredContestant?.imageUrl ? (
              <Image
                src={featuredContestant.imageUrl}
                alt={player.name}
                fill
                className="object-cover object-[center_top]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl text-gray-400">{player.name[0]}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-3">
            {/* Name */}
            <div>
              <p className="text-sm font-medium text-gray-900">{player.name}</p>
              {featuredContestant && (
                <p className="text-xs text-gray-400">
                  {featuredContestant.survivorSeason.theme ?? featuredContestant.survivorSeason.title}
                </p>
              )}
            </div>

            {/* Personal details */}
            <div className="flex flex-col gap-1.5 text-xs text-gray-500">
              {player.birthDate && (
                <div className="flex gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">Born</span>
                  <span>{formatBirthDate(new Date(player.birthDate))}</span>
                </div>
              )}
              {featuredContestant?.hometown && (
                <div className="flex gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">From</span>
                  <span>{featuredContestant.hometown}</span>
                </div>
              )}
              {featuredContestant?.occupation && (
                <div className="flex gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">Job</span>
                  <span>{featuredContestant.occupation}</span>
                </div>
              )}
            </div>

            {/* Survivor career */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Survivor Career
              </p>
              <div className="flex flex-col gap-1.5">
                {contestants.map(c => (
                  <SeasonAccordion key={c.id} contestant={c} />
                ))}
              </div>
            </div>

            {/* Full profile link */}
            <Link
              href={`/survivor/players/${player.id}`}
              className="text-xs text-green-700 hover:text-green-800 font-medium transition-colors text-center"
            >
              View full profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}