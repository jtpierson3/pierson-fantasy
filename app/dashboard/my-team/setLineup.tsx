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
import {
    FORMATIONS,
    getFormationRows,
    getPositionType,
    canFillSlot,
    type Formation,
    type FormationSlot,
} from '@/lib/formations'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { FantasyTeamWithPlayers, PlayerWithDetails } from './types'
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
function EmptySlot({ slotId, variant, slot }: { 
    slotId: string 
    variant: 'pitch' | 'list'
    slot?: FormationSlot
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  const label = slot
    ? slot.type === 'fixed'
        ? slot.position
        : slot.label
    : slotLabel(slotId)

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
          <span className="text-white/40 text-xs">{label}</span>
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
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  )
}

// Draggable player on pitch
function DraggablePitchPlayer({ fp, onClick }: { fp: PlayerWithDetails; onClick: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fp.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
    >
      <PlayerCard player={fp.player} />
    </div>
  )
}

// Draggable player in list
function DraggableListPlayer({ fp, onClick }: { fp: PlayerWithDetails; onClick: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fp.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
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

type PopoverOption = {
    label: string
    onClick: () => void
    disabled?: boolean
}

function PlayerPopover({
    options,
    onClose,
} : {
    options: PopoverOption[]
    onClose: () => void
}) {
    return (
        <>
            {/* BACKDROP */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
            {/* Menu */}
            <div className="absolute z-50 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                {options.map((opt, i) => (
                   <button 
                    key={i}
                    onClick={() => { opt.onClick(); onClose() }}
                    disabled={opt.disabled}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                   >
                    {opt.label}
                   </button> 
                ))}
            </div>
        </>
    )
}

function ReplaceModal({
    title,
    players,
    onConfirm,
    onClose,
} : {
    title: string
    players: PlayerWithDetails[]
    onConfirm: (replaceId: string) => void
    onClose: () => void
}) {
    const [selected, setSelected] = useState('')

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z=50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Select a player to replace:
                </p>
                <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 mb-4"
                >
                    <option value="">Select a player...</option>
                    {players.map(fp => (
                        <option key={fp.id} value={fp.id}>
                            {fp.player.display_name}
                        </option>
                    ))}
                </select>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { if (selected) onConfirm(selected) }}
                        disabled={!selected}
                        className="px-4 py-2 text-sm rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}

type PopoverState = {
    playerId: string
    x: number
    y: number
} | null

type ReplaceState = {
    playerId: string
    targetSlot: 'STARTER' | 'SUB'
} | null

export default function SetLineup({ team, onUpdate }: Props) {
  const [formation, setFormation] = useState<Formation>(team.formation as Formation)
  const [players, setPlayers] = useState(team.players)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const rows = getFormationRows(formation)
  
  //Map players to rows
  function assignPlayersToRow(slots: FormationSlot[], availablePlayers: PlayerWithDetails[]) {
    const assigned: (PlayerWithDetails | null)[] = []
    const remaining = [...availablePlayers]


    for (const slot of slots) {
        const idx = remaining.findIndex(p => {
            const posType = getPositionType(
                p.player.detailed_position_id,
                p.player.position_id
            )
            return posType !== null && canFillSlot(slot, posType)
        })

        if (idx !== -1) {
            assigned.push(remaining[idx])
            remaining.splice(idx, 1)
        } else {
            assigned.push(remaining[idx])
            remaining.splice(idx, 1)
            // TODO: PUT A WARNING HERE THAT THIS PLAYER NORMALLY DOESN'T Play here.
        }
    }

    return assigned
  }

  // Build slot maps
  const starters = players.filter(p => p.rosterSlot === 'STARTER')
  const subs = players.filter(p => p.rosterSlot === 'SUB')
  const reserves = players.filter(p => p.rosterSlot === 'RESERVE')
  const ir = players.filter(p => p.rosterSlot === 'IR')

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

  const [popover, setPopover] = useState<PopoverState>(null)
  const [replaceModal, setReplaceModal] = useState<ReplaceState>(null)
  
  const starterCount = starters.length
  const subCount = subs.length

  function handlePlayerClick(fp: PlayerWithDetails, e: React.MouseEvent) {
    e.stopPropagation()
    // If dragging don't open popover
    if (activeId) return
    setPopover({ playerId: fp.id, x: e.clientX, y: e.clientY })
  }

  function movePlayers(playerId: string, targetSlot: string, replaceId?: string) {
    setPlayers(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(p => p.id === playerId)
        if (idx === -1) return prev

        //If replacing, move the replaced player to the moving player's old slot
        if (replaceId) {
            const replaceIdx = updated.findIndex(p => p.id === replaceId)
            if (replaceIdx !== -1) {
                updated[replaceIdx] = { ...updated[replaceIdx], rosterSlot: updated[idx].rosterSlot}
            }
        }

        updated[idx] = { ...updated[idx], rosterSlot: targetSlot as PlayerWithDetails['rosterSlot'] }
        return updated
    })
  }

  function getPopoverOptions(fp: PlayerWithDetails): PopoverOption[] {
    const options: PopoverOption[] = []
    const currentSlot = fp.rosterSlot

    if (currentSlot !== 'STARTER') {
        options.push({
            label: 'Set as Starter',
            onClick: () => {
                if (starterCount >= 11) {
                    setReplaceModal({ playerId: fp.id, targetSlot: 'STARTER' })
                } else {
                    movePlayers(fp.id, 'STARTER')
                }
            }
        })
    }

    if (currentSlot !== 'SUB') {
        options.push({
            label: 'Set as Sub',
            onClick: () => {
                if (subCount >= 5) {
                    setReplaceModal({ playerId: fp.id, targetSlot: 'SUB' })
                } else {
                    movePlayers(fp.id, 'SUB')
                }
            }
        })
    }

    if (currentSlot !== 'RESERVE') {
        options.push({
            label: 'Move to Reserve',
            onClick: () => movePlayers(fp.id, 'RESERVE')
        })
    }

    if (currentSlot !== 'IR') {
        options.push({
            label: 'Move to IR',
            onClick: () => movePlayers(fp.id, 'IR')
        })
    }

    return options
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
                {rows.map(row => {
                  const assigned = assignPlayersToRow(row.slots, starters)
                  return (
                    <div key={row.label} className="flex justify-around items-center py-3">
                        {row.slots.map((slot, i) => {
                            const fp = assigned[i]
                            const slotId = `pitch-${row.label}-${i}`

                            return fp
                                ? <DraggablePitchPlayer 
                                        key={fp.id} 
                                        fp={fp} 
                                        onClick={(e) => handlePlayerClick(fp, e)} 
                                    />
                                : <EmptySlot key={slotId} slotId={slotId} variant="pitch" slot={slot}/>
                        })}
                    </div>
                  )
                })}
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
              {subs.map(fp => 
                <DraggableListPlayer 
                    key={fp.id} 
                    fp={fp} 
                    onClick={(e) => handlePlayerClick(fp, e)}
                />
              )}
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
              {reserves.map(fp => 
                <DraggableListPlayer 
                    key={fp.id} 
                    fp={fp} 
                    onClick={(e) => handlePlayerClick(fp, e)}
                />  
              )}
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
              {ir.map(fp => 
                <DraggableListPlayer 
                    key={fp.id} 
                    fp={fp} 
                    onClick={(e) => handlePlayerClick(fp, e)}
                />
              )}
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

      {/* Popover */}
      {popover && (() => {
        const fp = players.find(p => p.id === popover.playerId)
        if (!fp) return null
        return (
            <div
                className="fixed z=50"
                style={{ top: popover.y, left: popover.x }}
            >
                <PlayerPopover 
                    options={getPopoverOptions(fp)}
                    onClose={() => setPopover(null)}
                />
            </div>
        )
      })()}

      {/* Replace Modal */}
      {replaceModal && (
        <ReplaceModal 
            title={replaceModal.targetSlot === 'STARTER' ? 'Replace a Starter' : 'Replace a Sub'}
            players={replaceModal.targetSlot === 'STARTER' ? starters : subs}
            onConfirm={(replaceId) => {
                movePlayers(replaceModal.playerId, replaceModal.targetSlot, replaceId)
                setReplaceModal(null)
            }}
            onClose={() => setReplaceModal(null)}
        />
      )}
    </DndContext>
  )
}