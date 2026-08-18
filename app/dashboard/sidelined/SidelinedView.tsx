'use client'

import { useState } from 'react'
import Image from 'next/image'

type SidelinedPlayer = {
  id: string
  playerId: number
  playerName: string
  playerImage: string | null
  category: string
  typeName: string
  startDate: string
  endDate: string | null
  gamesMissed: number
}

type MySidelinedPlayer = SidelinedPlayer & { teamName: string | null }

type TeamGroup = {
  team: { id: number; name: string; image_path: string }
  players: SidelinedPlayer[]
}

type Props = {
  mySidelined: MySidelinedPlayer[]
  sidelinedByTeam: TeamGroup[]
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      category === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {category === 'suspended' ? 'Suspended' : 'Injured'}
    </span>
  )
}

function DetailRow({ player }: { player: SidelinedPlayer }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
          {player.playerImage && (
            <Image src={player.playerImage} alt={player.playerName} fill className="object-contain" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{player.playerName}</p>
          <p className="text-xs text-gray-400">{player.typeName}</p>
        </div>
        <CategoryBadge category={player.category} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 pl-12">
        <span>Since {new Date(player.startDate).toLocaleDateString()}</span>
        <span>{player.gamesMissed} games missed</span>
        {player.endDate && (
          <span>Until {new Date(player.endDate).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  )
}

function TeamAccordionItem({ group }: { group: TeamGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 flex-shrink-0">
            <Image src={group.team.image_path} alt={group.team.name} fill className="object-contain" />
          </div>
          <span className="text-sm font-medium text-gray-900">{group.team.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{group.players.length}</span>
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3 flex flex-col gap-2 bg-gray-50">
          {group.players.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No current injuries or suspensions.</p>
          ) : (
            group.players.map(p => <DetailRow key={p.id} player={p} />)
          )}
        </div>
      )}
    </div>
  )
}

export default function SidelinedView({ mySidelined, sidelinedByTeam }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-medium text-gray-900 mb-6">Sidelined</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My team's sidelined players */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">Your Roster</h2>
          {mySidelined.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">None of your players are currently sidelined.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {mySidelined.map(p => <DetailRow key={p.id} player={p} />)}
            </div>
          )}
        </div>

        {/* All teams accordion */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">League-Wide</h2>
          <div className="flex flex-col gap-2">
            {sidelinedByTeam.map(group => (
              <TeamAccordionItem key={group.team.id} group={group} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}