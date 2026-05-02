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



export default function SetLineup({ team, onUpdate }: Props) {

    return(
        <div>
            <p> hi </p>
        </div>
    )
}