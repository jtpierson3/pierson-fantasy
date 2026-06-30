'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { FantasyTeamWithPlayers, PlayerWithDetails } from './types'
import { FORMATIONS, parseFormation, type Formation } from './types'
import PlayerCard from '@/app/components/playerCard'
import PlayerListRow from '@/app/components/PlayerListRow'

type Props = {
  team: FantasyTeamWithPlayers
  onUpdate: (team: FantasyTeamWithPlayers) => void
}

// Slot ID format:
// pitch: "pitch-GK-0", "pitch-DEF-0", "pitch-MID-2", etc.
// subs: "sub-0" through "sub-4"
// reserve: "reserve-0" through "reserve-6"
// ir: "ir-0" through "ir-3"

function slotLabel(slotId: string): string {
  if (slotId.startsWith('pitch-GK')) return 'GK'
  if (slotId.startsWith('pitch-DEF')) return 'DEF'
  if (slotId.startsWith('pitch-MID')) return 'MID'
  if (slotId.startsWith('pitch-ATT')) return 'ATT'
  if (slotId.startsWith('sub')) return 'SUB'
  if (slotId.startsWith('reserve')) return 'RES'
  if (slotId.startsWith('ir')) return 'IR'
  return '+'
}

// Droppable empty slot
function EmptySlot({ slotId, variant }: { slotId: string; variant: 'pitch' | 'list' }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  if (variant === 'pitch') {
    return (
      <div
        ref={setNodeRef}
        className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
          isOver
            ? 'border-white bg-white/20'
            : 'border-white/40 bg-white/10'
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white/60 text-lg leading-none">+</span>
          <span className="text-white/40 text-xs">{slotLabel(slotId)}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 px-3 py-2 border-b border-gray-50 transition-colors ${
        isOver ? 'bg-green-50' : 'bg-white'
      }`}
    >
      <div className={`w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 ${
        isOver ? 'border-green-400' : 'border-gray-300'
      }`}>
        <span className={`text-xs leading-none ${isOver ? 'text-green-500' : 'text-gray-300'}`}>+</span>
      </div>
      <span className="text-xs text-gray-300">{slotLabel(slotId)}</span>
    </div>
  )
}

// Draggable player on pitch
function DraggablePitchPlayer({ fp }: { fp: PlayerWithDetails }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fp.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <PlayerCard player={fp.player} />
    </div>
  )
}

// Draggable player in list
function DraggableListPlayer({ fp }: { fp: PlayerWithDetails }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fp.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <PlayerListRow
        player={fp.player}
        team={fp.player.team}
        isIR={fp.rosterSlot === 'IR'}
        size="sm"
      />
    </div>
  )
}

export default function SetLineup({ team, onUpdate }: Props) {
  const [formation, setFormation] = useState<Formation>(team.formation as Formation)
  const [players, setPlayers] = useState(team.players)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { def, mid, att } = parseFormation(formation)

  // Build slot maps
  const starters = players.filter(p => p.rosterSlot === 'STARTER')
  const subs = players.filter(p => p.rosterSlot === 'SUB')
  const reserves = players.filter(p => p.rosterSlot === 'RESERVE')
  const ir = players.filter(p => p.rosterSlot === 'IR')

  // Pitch rows — each is an array of slotId strings, filled by player or empty
  const pitchRows: { pos: string; slots: string[]; players: (PlayerWithDetails | null)[] }[] = [
    {
      pos: 'GK',
      slots: ['pitch-GK-0'],
      players: [starters.find(p => p.player.position_id === 24) ?? null],
    },
    {
      pos: 'DEF',
      slots: Array.from({ length: def }, (_, i) => `pitch-DEF-${i}`),
      players: Array.from({ length: def }, (_, i) => starters.filter(p => p.player.position_id === 25)[i] ?? null),
    },
    {
      pos: 'MID',
      slots: Array.from({ length: mid }, (_, i) => `pitch-MID-${i}`),
      players: Array.from({ length: mid }, (_, i) => starters.filter(p => p.player.position_id === 26)[i] ?? null),
    },
    {
      pos: 'ATT',
      slots: Array.from({ length: att }, (_, i) => `pitch-ATT-${i}`),
      players: Array.from({ length: att }, (_, i) => starters.filter(p => p.player.position_id === 27)[i] ?? null),
    },
  ]

  const activePlayer = activeId ? players.find(p => p.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const overId = over.id as string
    const activePlayerId = active.id as string

    setPlayers(prev => {
      const updated = [...prev]
      const activeIndex = updated.findIndex(p => p.id === activePlayerId)
      if (activeIndex === -1) return prev

      // Dropped onto another player — swap slots
      const overPlayerIndex = updated.findIndex(p => p.id === overId)
      if (overPlayerIndex !== -1) {
        const activeSlot = updated[activeIndex].rosterSlot
        const overSlot = updated[overPlayerIndex].rosterSlot
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: overSlot }
        updated[overPlayerIndex] = { ...updated[overPlayerIndex], rosterSlot: activeSlot }
        return updated
      }

      // Dropped onto an empty slot
      if (overId.startsWith('pitch-')) {
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'STARTER' }
        return updated
      }
      if (overId.startsWith('sub-')) {
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'SUB' }
        return updated
      }
      if (overId.startsWith('reserve-')) {
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'RESERVE' }
        return updated
      }
      if (overId.startsWith('ir-')) {
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'IR' }
        return updated
      }

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
          players: players.map(p => ({
            id: p.id,
            rosterSlot: p.rosterSlot,
            slotOrder: p.slotOrder,
          }))
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      onUpdate({ ...team, formation, players })
    } catch (err) {
      console.error('Saving Lineup Error:', err)
    } finally {
      setSaving(false)
    }
  }, [team, formation, players, onUpdate])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        {/* Formation + Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-gray-500">Formation:</p>
            <div className="flex gap-1 flex-wrap">
              {FORMATIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormation(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    formation === f
                      ? 'bg-green-800 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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

        <div className="flex gap-4">
          {/* Pitch */}
          <div className="flex-1">
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(180deg, #2d7a3a 0%, #1e5c29 100%)' }}
            >
              {/* Pitch markings */}
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

              {/* Players / empty slots */}
              <div className="relative z-10 py-4 px-2" style={{ minHeight: '400px' }}>
                {pitchRows.map(row => (
                  <div key={row.pos} className="flex justify-around items-center py-3">
                    {row.slots.map((slotId, i) => {
                      const fp = row.players[i]
                      return fp
                        ? <DraggablePitchPlayer key={fp.id} fp={fp} />
                        : <EmptySlot key={slotId} slotId={slotId} variant="pitch" />
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subs + Reserves + IR */}
          <div className="w-56 flex flex-col gap-4">
            {/* Subs */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Subs ({subs.length}/5)
                </p>
              </div>
              {subs.map(fp => <DraggableListPlayer key={fp.id} fp={fp} />)}
              {Array.from({ length: Math.max(0, 5 - subs.length) }, (_, i) => (
                <EmptySlot key={`sub-${subs.length + i}`} slotId={`sub-${subs.length + i}`} variant="list" />
              ))}
            </div>

            {/* Reserves */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reserves ({reserves.length}/7)
                </p>
              </div>
              {reserves.map(fp => <DraggableListPlayer key={fp.id} fp={fp} />)}
              {Array.from({ length: Math.max(0, 7 - reserves.length) }, (_, i) => (
                <EmptySlot key={`reserve-${reserves.length + i}`} slotId={`reserve-${reserves.length + i}`} variant="list" />
              ))}
            </div>

            {/* IR */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  IR ({ir.length}/4)
                </p>
              </div>
              {ir.map(fp => <DraggableListPlayer key={fp.id} fp={fp} />)}
              {Array.from({ length: Math.max(0, 4 - ir.length) }, (_, i) => (
                <EmptySlot key={`ir-${ir.length + i}`} slotId={`ir-${ir.length + i}`} variant="list" />
              ))}
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