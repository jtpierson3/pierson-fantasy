'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'

type ContestantWithDetails = Prisma.ContestantGetPayload<{
  include: {
    survivorPlayer: true
    tribeMemberships: { include: { tribe: true } }
    challengeResults: {
      where: { placement: 1 }
      include: { challenge: true }
    }
    votesReceived: { where: { isRevoked: false } }
    episodeStats: { include: { event: true } }
  }
}>

type Season = {
  airDate: Date | null
  castawayCount: number | null
}

type Props = {
  contestants: ContestantWithDetails[]
  season: Season
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function getAge(birthDate: Date, airDate: Date): number {
  const age = airDate.getFullYear() - birthDate.getFullYear()
  const m = airDate.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && airDate.getDate() < birthDate.getDate())) {
    return age - 1
  }
  return age
}

function getFinishLabel(
  contestant: ContestantWithDetails,
  eliminationOrder: number,
  juryOrder: number,
  castawayCount: number | null,
  isFiremaking: boolean
): string {
  const status = contestant.status
  const days = contestant.daysLasted ? `, Day ${contestant.daysLasted}` : ''

  if (status === 'winner') return `Sole Survivor${days}`
  if (status === 'finalist') {
    if (contestant.placement === 2) return `Runner-Up${days}`
    return `${getOrdinal(contestant.placement ?? 2)} Runner-Up${days}`
  }
  if (status === 'medevac') return `Medically evacuated${days}`
  if (status === 'quit') return `Quit${days}`

  if (isFiremaking) {
    return `Lost firemaking challenge${days}`
  }

  const bootLabel = castawayCount
    ? `${getOrdinal(eliminationOrder)} voted out`
    : `${getOrdinal(eliminationOrder)} voted out`

  if (status === 'jury') {
    return `${bootLabel}, ${getOrdinal(juryOrder)} jury member${days}`
  }

  return `${bootLabel}${days}`
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  eliminated: { label: 'Eliminated', color: 'bg-gray-100 text-gray-500' },
  jury: { label: 'Jury', color: 'bg-blue-100 text-blue-600' },
  finalist: { label: 'Finalist', color: 'bg-purple-100 text-purple-600' },
  winner: { label: 'Winner', color: 'bg-yellow-100 text-yellow-600' },
  medevac: { label: 'Medevac', color: 'bg-orange-100 text-orange-600' },
  quit: { label: 'Quit', color: 'bg-red-100 text-red-500' },
}

export default function CastawaysTab({ contestants, season }: Props) {
  const airDate = season.airDate ? new Date(season.airDate) : null

  // Sort: eliminated first (by episode), then remaining alphabetically
  const eliminated = contestants
    .filter(c => ['eliminated', 'jury', 'medevac', 'quit'].includes(c.status) && c.placement !== null)
    .sort((a, b) => {
        const aPlacement = a.placement ?? 999
        const bPlacement = b.placement ?? 999
        return bPlacement - aPlacement
    })

  const remaining = contestants
    .filter(c => !['eliminated', 'jury', 'medevac', 'quit'].includes(c.status) || c.eliminatedEpisode === null)
    .sort((a, b) => a.survivorPlayer.name.localeCompare(b.survivorPlayer.name))

  const sorted = [...eliminated, ...remaining]

  // Calculate elimination order and jury order
  let elimCount = 0
  let juryCount = 0

  const contestantMeta = new Map<string, { elimOrder: number; juryOrder: number; isFiremaking: boolean }>()

  eliminated.forEach(c => {
    elimCount++
    const isFiremaking = false // we'll derive below
    if (c.status === 'jury') {
      juryCount++
      contestantMeta.set(c.id, { elimOrder: elimCount, juryOrder: juryCount, isFiremaking })
    } else {
      contestantMeta.set(c.id, { elimOrder: elimCount, juryOrder: 0, isFiremaking })
    }
  })

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 mb-4">
        Castaways ({contestants.length})
      </h2>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div className="col-span-4">Contestant</div>
          <div className="col-span-4">Tribe Affiliation</div>
          <div className="col-span-3">Finish</div>
          <div className="col-span-1 text-center">Votes</div>
        </div>

        {sorted.map(contestant => {
          const meta = contestantMeta.get(contestant.id)
          const votesAgainst = contestant.votesReceived.length
          const statusBadge = STATUS_BADGE[contestant.status]

          // Get all tribe memberships sorted by episode
          const tribeMemberships = [...contestant.tribeMemberships].sort((a, b) => {
            if (!a.episodeId && !b.episodeId) return 0
            if (!a.episodeId) return -1
            if (!b.episodeId) return 1
            return 0
          })

          // Age at air date
          const age = airDate && contestant.survivorPlayer.birthDate
            ? getAge(new Date(contestant.survivorPlayer.birthDate), airDate)
            : null

          // All seasons played
          const isEliminated = ['eliminated', 'jury', 'medevac', 'quit'].includes(contestant.status)
          const finishLabel = meta
            ? getFinishLabel(contestant, meta.elimOrder, meta.juryOrder, season.castawayCount, meta.isFiremaking)
            : null

          return (
            <div
              key={contestant.id}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors"
            >
              {/* Contestant column */}
              <div className="col-span-4 flex items-center gap-3">
                {/* Photo */}
                <Link href={`/survivor/players/${contestant.survivorPlayerId}`}>
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {contestant.imageUrl ? (
                        <Image
                        src={contestant.imageUrl}
                        alt={contestant.survivorPlayer.name}
                        fill
                        className={`object-cover ${isEliminated ? 'grayscale' : ''}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm text-gray-400">
                            {contestant.survivorPlayer.name[0]}
                        </span>
                        </div>
                    )}
                    </div>
                </Link>

                {/* Info */}
                <div className="min-w-0">
                  <Link
                    href={`/survivor/players/${contestant.survivorPlayerId}`}
                    className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors truncate block"
                  >
                    {contestant.survivorPlayer.name}
                  </Link>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    {age && (
                      <span className="text-xs text-gray-400">Age {age}</span>
                    )}
                    {contestant.hometown && (
                      <span className="text-xs text-gray-400 truncate">{contestant.hometown}</span>
                    )}
                  </div>
                  {statusBadge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Tribe affiliation */}
              <div className="col-span-4">
                <div className="flex gap-1 flex-wrap">
                  {tribeMemberships.length > 0 ? (
                    tribeMemberships.map(tm => (
                      <span
                        key={tm.id}
                        className="text-xs px-2 py-1 rounded font-medium text-white"
                        style={{ backgroundColor: tm.tribe.color }}
                      >
                        {tm.tribe.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>

              {/* Finish */}
              <div className="col-span-3">
                {finishLabel ? (
                  <p className="text-xs text-gray-600">{finishLabel}</p>
                ) : contestant.status === 'winner' ? (
                  <p className="text-xs font-medium text-yellow-600">
                    Sole Survivor{contestant.daysLasted ? `, Day ${contestant.daysLasted}` : ''}
                  </p>
                ) : contestant.status === 'finalist' ? (
                  <p className="text-xs font-medium text-purple-600">
                    {contestant.placement === 2 ? 'Runner-Up' : `${getOrdinal(contestant.placement ?? 2)} Runner-Up`}
                    {contestant.daysLasted ? `, Day ${contestant.daysLasted}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Still playing</p>
                )}
              </div>

              {/* Votes against */}
              <div className="col-span-1 text-center">
                <span className="text-sm text-gray-600">{votesAgainst}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}