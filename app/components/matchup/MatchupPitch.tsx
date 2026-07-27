'use client'

import { getFormationRows, type Formation } from '@/lib/formations'
import { assignAllRows, type SlotAssignable } from '@/lib/lineupAssignment'
import PlayerCard from '@/app/components/playerCard'

type CardPlayer = {
  id: number
  display_name: string
  image_path: string
  position_id: number
  jersey_number?: number | null
  date_of_birth?: string | null
  teamId?: number
}

export type MatchupPlayer = SlotAssignable & {
  rosterSlot: string
  player: CardPlayer & { detailed_position_id: number | null }
  points?: number
}

export type MatchupTeamData = {
  name: string
  formation: string
  totalPoints: number
  players: MatchupPlayer[]
}

type Props = {
  homeTeam: MatchupTeamData
  awayTeam: MatchupTeamData
}

function TeamStartersRows({
  team,
  mirrored,
}: {
  team: MatchupTeamData
  mirrored: boolean
}) {
  const starters = team.players.filter(p => p.rosterSlot === 'STARTER')
  const { result: assignedRows } = assignAllRows(
    getFormationRows(team.formation as Formation),
    starters
  )

  const rows = mirrored ? [...assignedRows].reverse() : assignedRows

  return (
    <div className="flex flex-col justify-around h-full py-4">
      {rows.map(row => (
        <div key={row.label} className="flex justify-around items-center py-2">
          {row.slots.map((slot, i) => {
            const fp = row.assigned[i]
            if (!fp) return <div key={i} className="w-14 h-14" />
            const slotPositionLabel = slot.type === 'fixed' ? slot.position : slot.label
            return (
              <PlayerCard
                key={fp.id}
                player={fp.player}
                positionLabel={slotPositionLabel}
                points={fp.points ?? 0}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function BenchColumn({ team }: { team: MatchupTeamData }) {
  const subs = team.players
    .filter(p => p.rosterSlot === 'SUB')
    .sort((a, b) => a.slotOrder - b.slotOrder)
  const reserves = team.players
    .filter(p => p.rosterSlot === 'RESERVE')
    .sort((a, b) => a.slotOrder - b.slotOrder)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Subs
        </p>
        <div className="flex flex-col gap-1.5">
          {subs.map(fp => (
            <div
              key={fp.id}
              className="bg-white border border-gray-100 rounded-lg px-2 py-1.5 flex items-center gap-2"
            >
              <span className="text-xs font-medium text-gray-400 w-4">{fp.slotOrder}</span>
              <PlayerCard player={fp.player} points={fp.points ?? 0} size="sm" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Reserves
        </p>
        <div className="flex flex-col gap-1.5">
          {reserves.map(fp => (
            <div
              key={fp.id}
              className="bg-white border border-gray-100 rounded-lg px-2 py-1.5 flex items-center gap-2"
            >
              <span className="text-xs font-medium text-gray-400 w-4">{fp.slotOrder}</span>
              <PlayerCard player={fp.player} points={fp.points ?? 0} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MatchupPitch({ homeTeam, awayTeam }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-6 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-400">{homeTeam.name}</p>
          <p className="text-xs text-gray-400">{homeTeam.formation}</p>
        </div>
        <div className="text-center px-6">
          <p className="text-2xl font-bold text-white">
            {homeTeam.totalPoints} : {awayTeam.totalPoints}
          </p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-blue-400">{awayTeam.name}</p>
          <p className="text-xs text-gray-400">{awayTeam.formation}</p>
        </div>
      </div>

      {/* Shared pitch */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #2d7a3a 0%, #1e5c29 100%)' }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 400 900"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="450" x2="400" y2="450" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx="200" cy="450" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <rect x="10" y="10" width="380" height="880" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            </svg>

            <div className="relative z-10" style={{ minHeight: '900px' }}>
              <div style={{ height: '440px' }}>
                <TeamStartersRows team={homeTeam} mirrored={false} />
              </div>
              <div style={{ height: '440px' }}>
                <TeamStartersRows team={awayTeam} mirrored={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bench — subs & reserves, home | away */}
      <div className="grid grid-cols-2 gap-6">
        <BenchColumn team={homeTeam} />
        <BenchColumn team={awayTeam} />
      </div>
    </div>
  )
}