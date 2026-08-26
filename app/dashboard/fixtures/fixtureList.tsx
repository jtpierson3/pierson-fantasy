'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { COMPETITIONS, type CompetitionKey } from '@/lib/sportmonksConstants'
import Link from 'next/link'

type FixtureWithTeams = Prisma.FixtureGetPayload<{
  include: { homeTeam: true; awayTeam: true }
}>

type Props = {
  fixtures: FixtureWithTeams[]
}

const COMPETITION_LABELS: Record<CompetitionKey, string> = {
  premier_league: 'Premier League',
  fa_cup: 'FA Cup',
  carabao_cup: 'Carabao Cup',
  championship: 'Championship',
  la_liga: 'La Liga'
}

const FINISHED_STATUSES = new Set(['FT', 'AET', 'FTP'])

function formatKickoff(date: Date) {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function FixtureList({ fixtures }: Props) {
  const [competition, setCompetition] = useState<CompetitionKey>('premier_league')

  const competitionFixtures = useMemo(
    () => fixtures.filter(f => f.competition === competition),
    [fixtures, competition]
  )

  const isGameweekBased = competition === 'premier_league'

  // Build the list of selectable groups (gameweek numbers or round names)
  const groups = useMemo(() => {
    if (isGameweekBased) {
      const weeks = Array.from(
        new Set(
          competitionFixtures
            .map(f => f.gameweekNumber)
            .filter((n): n is number => n !== null)
        )
      ).sort((a, b) => a - b)
      return weeks.map(w => ({ key: String(w), label: `GW${w}` }))
    }

    const rounds = Array.from(
      new Set(competitionFixtures.map(f => f.round).filter((r): r is string => r !== null))
    )
    return rounds.map(r => ({ key: r, label: r }))
  }, [competitionFixtures, isGameweekBased])

  // Default to the next unfinished group
  const defaultGroupKey = useMemo(() => {
    for (const group of groups) {
      const groupFixtures = competitionFixtures.filter(f =>
        isGameweekBased ? String(f.gameweekNumber) === group.key : f.round === group.key
      )
      const hasUnfinished = groupFixtures.some(f => !FINISHED_STATUSES.has(f.status))
      if (hasUnfinished) return group.key
    }
    return groups[groups.length - 1]?.key ?? ''
  }, [groups, competitionFixtures, isGameweekBased])

  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const activeGroup = selectedGroup || defaultGroupKey

  const displayedFixtures = useMemo(() => {
    return competitionFixtures
      .filter(f => (isGameweekBased ? String(f.gameweekNumber) === activeGroup : f.round === activeGroup))
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  }, [competitionFixtures, activeGroup, isGameweekBased])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Fixtures</h1>
      </div>

      {/* Competition tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(Object.keys(COMPETITIONS) as CompetitionKey[]).map(key => (
          <button
            key={key}
            onClick={() => {
              setCompetition(key)
              setSelectedGroup('')
            }}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
              competition === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {COMPETITION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Gameweek / Round selector */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {groups.map(group => (
          <button
            key={group.key}
            onClick={() => setSelectedGroup(group.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
              activeGroup === group.key
                ? 'bg-green-800 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Fixtures list */}
      {displayedFixtures.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No fixtures found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedFixtures.map(fixture => {
            const isFinished = FINISHED_STATUSES.has(fixture.status)
            return (
              <Link
                key={fixture.id}
                href={`/dashboard/fixtures/${fixture.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-shadow"
              >
                <p className="text-xs text-gray-400 mb-2">
                  {formatKickoff(fixture.kickoff)}
                  {fixture.venue && ` · ${fixture.venue}`}
                </p>
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Home team */}
                  <div className="col-span-5 flex items-center gap-2 justify-end">
                    <span className="text-sm font-medium text-gray-900 text-right truncate">
                      {fixture.homeTeamName}
                    </span>
                    {fixture.homeTeamImage && (
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={fixture.homeTeamImage}
                          alt={fixture.homeTeamName}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Score / vs */}
                  <div className="col-span-2 text-center">
                    {isFinished || fixture.status !== 'NS' ? (
                      <span className="text-sm font-medium text-gray-900">
                        {fixture.homeScore ?? '-'} : {fixture.awayScore ?? '-'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">vs</span>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="col-span-5 flex items-center gap-2">
                    {fixture.awayTeamImage && (
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={fixture.awayTeamImage}
                          alt={fixture.awayTeamName}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {fixture.awayTeamName}
                    </span>
                  </div>
                </div>

                {!isFinished && fixture.status !== 'NS' && (
                  <p className="text-xs text-blue-600 text-center mt-2 font-medium">
                    {fixture.status}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}