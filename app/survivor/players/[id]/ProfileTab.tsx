'use client'

import type { PlayerWithDetails } from './types'

type Props = {
    player: PlayerWithDetails
}

export default function ProfileTab({ player }: Props) {
    if (player.contestants.every(c => !c.profile)) {
        return <p className="text-sm text-gray-400">No Preseason Profiles Yet.</p>
    }

    return(
        <div className="flex flex-col gap-6">
            <h3 className="text-sm font-medium text-gray-900">Preaseason Profiles</h3>
            {player.contestants.map(c => {
                if (!c.profile) return null
                return (
                    <div key={c.id}>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                            {c.survivorSeason.title}
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">{c.profile}</p>
                    </div>
                )
            })}
        </div>
    )
}