'use client'

import { useState, useCallback } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent

} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { FantasyTeamWithPlayers, PlayerWithDetails } from "./types"
import {
    FORMATIONS,
    parseFormation,
    type Formation,
} from './types'
import PlayerCard from '@/app/components/playerCard'
import PlayerListRow from '@/app/components/PlayerListRow'

type Props = {
    team: FantasyTeamWithPlayers
    onUpdate: (team: FantasyTeamWithPlayers) => void
}

function DraggablePitchPlayer({ fp }: { fp: PlayerWithDetails }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: fp.id,
    })

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1
            }}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
        >
            <PlayerCard player={fp.player} />
        </div>
    )
}

export default function SetLineup({ team, onUpdate }: Props) {

    return(
        <div>
            <p> hi </p>
        </div>
    )
}