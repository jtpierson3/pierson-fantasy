'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isSupportedFormation, type Formation } from '@/lib/formations'
import PlayerCard from '@/app/components/playerCard'
import { assignRealMatchLineup } from '@/lib/realMatchLineupAssignment'

type RealPlayer = {
  id: string
  playerId: number
  wasStarter: boolean
  positionPlayedId: number | null
  points: number
  breakdown: unknown
  player: {
    id: number
    display_name: string
    image_path: string
    position_id: number
    detailed_position_id: number | null
    team: { name: string; image_path: string; leagueId: number } | null
  }
}

type Props = {
  fixture: {
    id: number
    homeTeamName: string
    awayTeamName: string
    homeTeamImage: string | null
    awayTeamImage: string | null
    homeScore: number | null
    awayScore: number | null
    kickoff: string
    homeFormation: string | null
    awayFormation: string | null
    competition: string
  }
  homePlayers: RealPlayer[]
  awayPlayers: RealPlayer[]
}

function TeamPitchHalf({ teamName, formation, players, mirrored, borderColorHex, selectedPlayerId, onSelectPlayer }: {
  teamName: string
  formation: string | null
  players: RealPlayer[]
  mirrored: boolean
  borderColorHex: string
  selectedPlayerId: string | null
  onSelectPlayer: (id: string) => void
}) {
  if (!isSupportedFormation(formation)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-white/70 bg-black/30 px-4 py-2 rounded-lg">
          Error, unfound formation{formation ? ` (${formation})` : ''}
        </p>
      </div>
    )
  }

  const starters = players.filter(p => p.wasStarter)

  const { rows: assignedRows } = assignRealMatchLineup(
    formation as Formation,
    starters.map(p => ({
      id: p.id,
      playerId: p.playerId,
      positionPlayedId: p.positionPlayedId,
      broadPositionId: p.positionPlayedId === 24 ? 24 : null,
      original: p
    }))
  )

  const rows = mirrored ? [...assignedRows].reverse() : assignedRows

  return (
    <div className="flex flex-col justify-around h-full py-4">
      {rows.map(row => (
        <div key={row.label} className="flex justify-around items-center py-2">
          {row.slots.map((slot, i) => {
            const assignedEntry = row.assigned[i]
            if (!assignedEntry) return <div key={i} className="w-14 h-14" />
            const realPlayer = assignedEntry.original as RealPlayer
            const slotPositionLabel = slot.type === 'fixed' ? slot.position : slot.label
            return (
              <button key={realPlayer.id} onClick={() => onSelectPlayer(realPlayer.id)}>
                <PlayerCard
                  player={realPlayer.player}
                  positionLabel={slotPositionLabel}
                  points={realPlayer.points}
                  isHomeTeam={!mirrored}
                />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function RealMatchView({ fixture, homePlayers, awayPlayers }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const selectedPlayer = [...homePlayers, ...awayPlayers].find(p => p.id === selectedPlayerId) ?? null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-6 py-4 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative w-8 h-8">
            {fixture.homeTeamImage && (
                <Image src={fixture.homeTeamImage} alt={fixture.homeTeamName} fill className="object-contain" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-orange-400">{fixture.homeTeamName}</p>
            <p className="text-xs text-gray-400">{fixture.homeFormation ?? 'Formation not yet available'}</p>
          </div>
        </div>
        <div className="text-center px-6">
          <p className="text-2xl font-bold text-white">
            {fixture.homeScore ?? '-'} : {fixture.awayScore ?? '-'}
          </p>
          <p className="text-xs text-gray-400">{new Date(fixture.kickoff).toLocaleString()}</p>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2">
          <div>
            <p className="text-sm font-medium text-blue-400 text-right">{fixture.awayTeamName}</p>
            <p className="text-xs text-gray-400 text-right">{fixture.awayFormation ?? 'Formation not yet available'}</p>
          </div>
          <div className="relative w-8 h-8">
            {fixture.awayTeamImage && (
                <Image src={fixture.awayTeamImage} alt={fixture.awayTeamName} fill className="object-contain" />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Pitch */}
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
                <TeamPitchHalf
                  teamName={fixture.homeTeamName}
                  formation={fixture.homeFormation}
                  players={homePlayers}
                  mirrored={false}
                  borderColorHex="#fb923c"
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
              </div>
              <div style={{ height: '440px' }}>
                <TeamPitchHalf
                  teamName={fixture.awayTeamName}
                  formation={fixture.awayFormation}
                  players={awayPlayers}
                  mirrored={true}
                  borderColorHex="#60a5fa"
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Score breakdown panel */}
        {selectedPlayer && (
          <div className="w-72 flex-shrink-0 bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">{selectedPlayer.player.display_name}</h3>
            <p className="text-xs text-gray-400 mb-3">{selectedPlayer.points} pts</p>
            <div className="flex flex-col gap-1">
              {Array.isArray(selectedPlayer.breakdown) &&
                (selectedPlayer.breakdown as { label: string; points: number, count?: number; pointsPerUnit: number }[]).map((line, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                        {line.label}
                        {line.count !== undefined && line.pointsPerUnit !== undefined && (
                            <span className="text-gray-400 ml-1">
                                ({line.count} X {line.pointsPerUnit})
                            </span>
                        )}
                        {line.count !== undefined && line.pointsPerUnit === undefined && (
                            <span className="text-gray-400 ml-1">
                                ({line.count})
                            </span>
                        )}
                    </span>
                    <span className={`font-medium ${line.points >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {line.points > 0 ? '+' : ''}{line.points}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}