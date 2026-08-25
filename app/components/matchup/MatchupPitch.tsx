'use client'

import { useState } from 'react'
import { getFormationRows, type Formation } from '@/lib/formations'
import { assignAllRows, type SlotAssignable } from '@/lib/lineupAssignment'
import PlayerCard from '@/app/components/playerCard'
import type { DisplayPlayer } from '@/lib/playerTypes'
import PlayerScoringModal from '@/app/components/PlayerScoringModal'

export type MatchupPlayer = SlotAssignable & {
  rosterSlot: string
  player: DisplayPlayer & { detailed_position_id: number | null }
  points?: number
  breakdown?: unknown
}

export type MatchupTeamData = {
  name: string
  formation: string
  totalPoints: number
  players: MatchupPlayer[]
  rank: number | null
  totalTeams: number
  leagueRecord: { wins: number; losses: number; draws: number; leaguePoints: number }
}

type Props = {
  homeTeam: MatchupTeamData
  awayTeam: MatchupTeamData
}

function TeamStartersRows({
  team,
  mirrored,
  isHomeTeam,
  onSelectPlayer,
}: {
  team: MatchupTeamData
  mirrored: boolean
  isHomeTeam: boolean
  onSelectPlayer: (id: string) => void
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
              <button
                key={fp.id}
                onClick={() => onSelectPlayer(fp.id)}
              >
                <PlayerCard
                  key={fp.id}
                  player={fp.player}
                  positionLabel={slotPositionLabel}
                  points={fp.points ?? 0}
                  isHomeTeam={isHomeTeam}
                />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function BenchSection({
    team,
    slot,
    label,
    isHomeTeam,
    onSelectPlayer,
}: {
    team: MatchupTeamData
    slot: 'SUB' | 'RESERVE'
    label: string
    isHomeTeam: boolean
    onSelectPlayer: (id: string) => void
}) {
    const players = team.players
        .filter(p => p.rosterSlot === slot)
        .sort((a, b) => a.slotOrder - b.slotOrder)

    return (
        <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {label}
            </p>
            <div className="flex flex-col gap-1.5">
                {players.map(fp => (
                    <button
                        key={fp.id}
                        onClick={() => onSelectPlayer(fp.id)}
                        className="bg-white border border-gray-100 rounded-lg px-2 py-1.5 flex items-center gap-2 text-left"
                    >
                        <span className="text-xs font-medium text-gray-400 w-4">{fp.slotOrder}</span>
                        <PlayerCard player={fp.player} points={fp.points ?? 0} size="sm" isHomeTeam={isHomeTeam} />
                    </button>
                ))}
            </div>
        </div>
    )
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v -20) % 10] ?? s[v] ?? s[0])
}

export default function MatchupPitch({ homeTeam, awayTeam }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const selectedPlayer = [...homeTeam.players, ...awayTeam.players]
    .find(p => p.id === selectedPlayerId) ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-6 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-400">{homeTeam.name}</p>
          <p className="text-xs text-gray-400">{homeTeam.formation}</p>
          <div className="flex items-center gap-2 mt-1">
            {homeTeam.rank !== null && (
                <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">
                    {ordinal(homeTeam.rank)}
                </span>
            )}
            <span className="text-xs text-gray-400">
                {homeTeam.leagueRecord.wins}W {homeTeam.leagueRecord.losses}L {homeTeam.leagueRecord.draws}D - {homeTeam.leagueRecord.leaguePoints} pts
            </span>
          </div>
        </div>
        <div className="text-center px-6">
          <p className="text-2xl font-bold text-white">
            {homeTeam.totalPoints} : {awayTeam.totalPoints}
          </p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-blue-400">{awayTeam.name}</p>
          <p className="text-xs text-gray-400">{awayTeam.formation}</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            {awayTeam.rank !== null && (
                <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">
                    {ordinal(awayTeam.rank)}
                </span>
            )}
            <span className="text-xs text-gray-400">
                {awayTeam.leagueRecord.wins}W {awayTeam.leagueRecord.losses}L {awayTeam.leagueRecord.draws}D - {awayTeam.leagueRecord.leaguePoints} pts
            </span>
          </div>
        </div>
      </div>

      {/* Reserves | Subs | Pitch | Subs | Reserves */}
      <div className="flex gap-3">
        <div className="w-40 flex-shrink-0">
            <BenchSection team={homeTeam} slot="RESERVE" label="Reserves" isHomeTeam={true} onSelectPlayer={setSelectedPlayerId}/>
        </div>
        <div className="w-40 flex-shrink-0">
            <BenchSection team={homeTeam} slot="SUB" label="Subs" isHomeTeam={true} onSelectPlayer={setSelectedPlayerId}/>
        </div>

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
                <TeamStartersRows team={homeTeam} mirrored={false} isHomeTeam={true} onSelectPlayer={setSelectedPlayerId}/>
              </div>
              <div style={{ height: '440px' }}>
                <TeamStartersRows team={awayTeam} mirrored={true} isHomeTeam={false} onSelectPlayer={setSelectedPlayerId}/>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-40 flex-shrink-0">
          <BenchSection team={awayTeam} slot="SUB" label="Subs" isHomeTeam={false} onSelectPlayer={setSelectedPlayerId}/>
        </div>
        <div className="w-40 flex-shrink-0">
          <BenchSection team={awayTeam} slot="RESERVE" label="Reserves" isHomeTeam={false} onSelectPlayer={setSelectedPlayerId}/>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerScoringModal
          playerName={selectedPlayer.player.display_name}
          playerImage={selectedPlayer.player.image_path}
          points={selectedPlayer.points ?? 0}
          breakdown={selectedPlayer.breakdown}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  )
}