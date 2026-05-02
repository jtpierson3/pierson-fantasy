'use client'

import Image from 'next/image'
import type { FantasyTeamWithPlayers, PlayerWithDetails } from './types'
import { getPositionColor, getPositionShort } from '@/lib/helpers'
import PlayerListRow from '@/app/components/PlayerListRow'
import { Play } from 'next/font/google'

type Props = {
    team: FantasyTeamWithPlayers
}

function Section({
    title,
    players, 
    label,
}: {
    title: string
    players: PlayerWithDetails[]
    label: string
}) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
                <p className="text-xs text-gray-400">{players.length} players</p>
            </div>
            {players.map(fp => (
                <PlayerListRow 
                    key={fp.id}
                    player={fp.player}
                    team={fp.player.team}
                    isIR={fp.rosterSlot === 'IR'}
                />
            ))}
        </div>
    )
}

export default function TeamStats({ team }: Props) {
    const starters = team.players.filter(p => p.rosterSlot === 'STARTER')
    const subs = team.players.filter(p => p.rosterSlot === 'SUB')
    const reserves = team.players.filter(
        p => p.rosterSlot === 'RESERVE' || p.rosterSlot === 'IR'
    )

    const totalPoints = 0 // will be wired up when scoring is implemented

    return (
        <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">Team Stats</h2>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Total points</p>
                    <p className="text-lg font-medium text-gray-900">{totalPoints}</p>
                </div>

            </div>

            <Section title="Starters" players={starters} label="Starter" />
            <Section title="Subs" players={subs} label="Subs" />
            <Section title="Reserves & IR" players={reserves} label="Reserve" />
        </div>
    )
}