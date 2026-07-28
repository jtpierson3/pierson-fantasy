'use client'

import { getFormationRows, type Formation } from '@/lib/formations'
import { assignAllRows, type SlotAssignable } from '@/lib/lineupAssignment'
import PlayerCard from '@/app/components/playerCard'

type Props = {
    formation: string
    starters: SlotAssignable[]
    compact?: boolean
}

export default function StartingElevenPitch({ formation, starters, compact }: Props) {
    const { result: assignedRows } = assignAllRows(
        getFormationRows(formation as Formation),
        starters
    )

    return (
        <div
            className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#2d7a3a] to-[#1e5c29]"
            style={{
                minHeight: compact ? '280px' : '500px'
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 500"
                preserveAspectRatio="none"
            >
                <line x1="0" y1="250" x2="400" y2="250" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <circle cx="200" cy="250" r="50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <rect x="100" y="20" width="200" height="100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <rect x="150" y="20" width="100" height="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <rect x="10" y="10" width="380" height="480" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            </svg>

            <div className={`absolute top-4 left-4 z-20`}>
                <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/30">
                    {formation}
                </span>
            </div>

            <div
                className="relative z-10 flex flex-col justify-around px-4"
                style={{ minHeight: compact ? '280px' : '500px', paddingTop: '2rem', paddingBottom: '1rem' }}
            >
                {assignedRows.map(row => (
                    <div key={row.label} className="flex justify-around items-center py-2">
                        {row.slots.map((slot, i) => {
                            const fp = row.assigned[i]
                            if (!fp) return <div key={i} className={compact ? 'w-10 h-10': 'w-14 h-14'} />
                            const slotPositionLabel = slot.type === 'fixed' ? slot.position : slot.label
                            return (
                                <PlayerCard 
                                    key={fp.id}
                                    player={(fp as { player: unknown }).player as Parameters<typeof PlayerCard>[0]['player']}
                                    positionLabel={slotPositionLabel}
                                    size='sm'
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}