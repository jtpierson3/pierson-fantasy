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
import { useSortable } from '@dnd-kit/sortable'

type Props = {
    team: FantasyTeamWithPlayers
    onUpdate: (team: FantasyTeamWithPlayers) => void
}

function DraggablePitchPlayer({ fp }: { fp: PlayerWithDetails }) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: fp.id
    })

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
        >
            <PlayerCard player={fp.player} />
        </div>
    )
}

function DraggableListPlayer({ fp }: { fp: PlayerWithDetails }) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: fp.id
    })

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
        >
            <PlayerListRow
                player={fp.player}
                team={fp.player.team}
                isIR={fp.rosterSlot === 'IR'}
                size='sm'
            />
        </div>
    )
}


export default function SetLineup({ team, onUpdate }: Props) {
    const [formation, setFormation] = useState<Formation>(team.formation as Formation)
    const [players, setPlayers] = useState(team.players)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 8 }
    }))

    const starters = players.filter(p => p.rosterSlot === 'STARTER')
    const subs = players.filter(p=> p.rosterSlot === 'SUB')
    const reserves = players.filter(
        p => p.rosterSlot === 'RESERVE' || p.rosterSlot === 'IR'
    )

    const {def, mid, att } = parseFormation(formation)
    const gk = starters.filter(p=> p.player.position_id === 24)
    const defenders = starters.filter(p=> p.player.position_id === 25).slice(0, def)
    const midfielders = starters.filter(p=> p.player.position_id === 26).slice(0, mid)
    const attackers = starters.filter(p=> p.player.position_id === 27).slice(0, att)

    const activePlayer = activeId ? players.find(p => p.id === activeId) : null
    
    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)
        if (!over || active.id == over.id) return

        setPlayers(prev => {
            const activeIndex = prev.findIndex(p => p.id === active.id)
            const overIndex = prev.findIndex(p => p.id === over.id)
            if (activeIndex === -1 || overIndex === -1) return prev

            const updated = [...prev]
            const activeSlot = updated[activeIndex].rosterSlot
            const overSlot = updated[overIndex].rosterSlot

            updated[activeIndex] = { ...updated[activeIndex], rosterSlot: overSlot }
            updated[overIndex] = { ...updated[overIndex], rosterSlot: activeSlot}

            return updated
        })
    }

    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/my-team/lineup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fantasyTeamId: team.id,
                    formation,
                    players: players.map( p => ({
                        id: p.id,
                        rosterSlot: p.rosterSlot,
                        slotOrder: p.slotOrder,
                    }))
                })
            })

            if (!res.ok) throw new Error('Failed to save')
            
            onUpdate({ ...team, formation, players })

        } catch (err) {
            console.error('Saving Lineup Error: ', err)
        } finally {
            setSaving(false)
        }
    }, [team, formation, players, onUpdate])

    return(
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-4">
                {/* FORMATION SAVE */}
                <div className="flex items-center justify-between">
                    <div className="felx items-center gap-2">
                        <p className="text-sm text-gray-500">Formation:</p>
                        <div className='flex gap-1 flex-wrap'>
                            {FORMATIONS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFormation(f)}
                                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                        formation === f
                                            ? 'bg-green-800 text-white'
                                            : 'bg-gra-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium bg-green-800 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Lineup'}
                    </button>
                </div>

                <div className ="flex gap-4">
                    {/* PITCH */}
                    <div className="flex-1">
                        <div 
                            className="relative rounded-xl overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, #2d7a3a 0%, #1e5c29 100%)' }}
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

                            <div className="relative z-10 py-4 px-2" style={{ minHeight: '400px' }}>
                                <div className="flex justify-around items-center py-3">
                                    {gk.map(fp => <DraggablePitchPlayer key={fp.id} fp={fp} />)}
                                </div>
                                <div className="flex justify-around items-center py-3">
                                    {defenders.map(fp => <DraggablePitchPlayer key={fp.id} fp={fp} />)}
                                </div>
                                <div className="flex justify-around items-center py-3">
                                    {midfielders.map(fp => <DraggablePitchPlayer key={fp.id} fp={fp} />)}
                                </div>
                                <div className="flex justify-around items-center py-3">
                                    {attackers.map(fp => <DraggablePitchPlayer key={fp.id} fp={fp} />)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subs and Reserves */}
                    <div className="w-56 flex flex-col gap-4">
                        <div className="bg-white border-border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Subs ({subs.length}/5)
                                </p>
                            </div>
                            {subs.map(fp => <DraggableListPlayer key={fp.id} fp={fp} />)}
                        </div>

                        <div className="bg-white border-border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Reserves ({reserves.length}/7)
                                </p>
                            </div>
                            {reserves.map(fp => <DraggableListPlayer key={fp.id} fp={fp} />)}
                        </div>
                    </div>
                </div>
            </div>
            
            <DragOverlay>
                {activePlayer && <PlayerCard player={activePlayer.player} />}
            </DragOverlay>
        </DndContext>
    )
}