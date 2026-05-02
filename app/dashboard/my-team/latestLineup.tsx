'use client'

import Image from 'next/image'
import type { FantasyTeamWithPlayers, PlayerWithDetails } from './types'
import { parseFormation } from './types'
import { getPositionColor, getPositionShort } from '@/lib/helpers'
import PlayerCard from '@/app/components/playerCard'
import PlayerListRow from '@/app/components/PlayerListRow'

type Props = {
    team: FantasyTeamWithPlayers
}

function PitchRow({ players }: { players: PlayerWithDetails[]}) {
    return (
        <div className="flex justify-around items-center py-3">
            {players.map(fp => (
                <PlayerCard key={fp.id} player={fp.player} points={0} />
            ))}
        </div>
    )
}

export default function LatestLineup({ team }: Props) {
    const starters = team.players.filter(p => p.rosterSlot === 'STARTER')
    const subs = team.players.filter(p => p.rosterSlot === 'SUB')

    const { def, mid, att } = parseFormation(team.formation)

    const gk = starters.filter(p => p.player.position_id === 24)
    const defenders = starters.filter(p => p.player.position_id === 25).slice(0, def)
    const midfielders = starters.filter(p => p.player.position_id === 26).slice(0, mid)
    const attackers = starters.filter(p => p.player.position_id === 27).slice(0, att)

    return(
        <div className="flex gap-4 h-full">
            {/* Pitch */}
            <div className="w-3/4">
                <div
                    className="relative rounded-xl overflow-hidden h-full"
                    style={{ background: 'linear-gradient(180deg, #2d7a3a 0%, #1e5c29 100%)'}}
                >
                    <svg 
                        className="absolute inset-0 w-full h-full" 
                        viewBox="0 0 400 500" 
                        preserveAspectRatio="none"
                    >
                        <line x1="0" y1="250" x2="400" y2="250" stroke="rgba(255, 255, 255, 0.2" strokeWidth="1"/>
                        <circle cx="200" cy="250" r="50" fill="none" stroke="rgba(255, 255, 255, 0.2" strokeWidth="1"/>
                        <rect x="100" y="20" width="200" height="100" fill="none" stroke="rgba(255, 255, 255, 0.2" strokeWidth="1"/>
                        <rect x="150" y="20" width="100" height="40" fill="none" stroke="rgba(255, 255, 255, 0.2" strokeWidth="1"/>
                        <rect x="10" y="10" width="380" height="480" fill="none" stroke="rgba(255, 255, 255, 0.3" strokeWidth="1"/>
                    </svg>

                    {/*Formation Badge*/}
                    <div className="absolute top-6 left-6 z-20">
                        <span className="text-sm font-bold bg-white/20 text-white px-3.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/30">
                            {team.formation}
                        </span>
                    </div>

                    <div className="relative z-10 flex flex-col justify-around py-6 px-4" style={{ minHeight: '500px' }}>
                        <PitchRow players={gk} />
                        <PitchRow players={defenders} />
                        <PitchRow players={midfielders} />
                        <PitchRow players={attackers} />
                    </div>
                </div>
            </div>

            {/* SUBS */}
            <div className="w-1/4 flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1 mb-1">
                    Subs ({subs.length})
                </p>
                {subs.map(fp => (
                    <div
                        key={fp.id}
                        className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center"
                    >
                        <PlayerCard player={fp.player} points={0} size="sm" />
                    </div>
                ))}
            </div>
        </div>
    )
}