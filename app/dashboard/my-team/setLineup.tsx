'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    getFormationSlots,
} from '@/lib/formations'
import { FantasyTeamWithPlayers, PlayerWithDetails, TargetGameweek } from './types'
import DraggableWrapper from '@/app/components/DraggableWrapper'
import PlayerCard from '@/app/components/playerCard'
import PlayerListRow from '@/app/components/PlayerListRow'
import { isPremierLeagueEligible } from '@/lib/playerEligibility'

type Props = {
  team: FantasyTeamWithPlayers
  onUpdate: (team: FantasyTeamWithPlayers) => void
  targetGameweek: TargetGameweek
  targetGameweekLockTime: string | null
  sidelinedByPlayerId: Record<number, { category: string; typeName: string; endDate: string | null }>
}

function isEligible(fp: PlayerWithDetails): boolean {
  return isPremierLeagueEligible(fp.player.team?.leagueId)
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

  function normalizeSlotOrder(players: PlayerWithDetails[], formation: Formation): PlayerWithDetails[] {
    const slotCount = getFormationSlots(formation).length
    const updated = [...players]

    // Normalize Starters
    const starters = updated.filter(p => p.rosterSlot === 'STARTER')
    const usedStarterSlots = new Set<number>()
    const startersNeedingSlot: PlayerWithDetails[] = []

    starters.forEach(p => {
        if (p.slotOrder >= 0 && p.slotOrder < slotCount && !usedStarterSlots.has(p.slotOrder)) {
            usedStarterSlots.add(p.slotOrder)
        } else {
            startersNeedingSlot.push(p)
        }
    })

    // assign remaining starters to the first open slot
    let nextOpenSlot = 0
    startersNeedingSlot.forEach(p => {
        while (usedStarterSlots.has(nextOpenSlot) && nextOpenSlot < slotCount) nextOpenSlot++
        const idx = updated.findIndex(u => u.id === p.id)
        updated[idx] = { ...updated[idx], slotOrder: nextOpenSlot }
        usedStarterSlots.add(nextOpenSlot)
    })

    // Normalize Subs (1-5)
    const subs = updated.filter(p => p.rosterSlot === 'SUB')
    const usedSubOrders = new Set<number>()
    const subsNeedingOrder: PlayerWithDetails[] = []

    subs.forEach(p => {
        if (p.slotOrder >= 1 && p.slotOrder <= 5 && !usedSubOrders.has(p.slotOrder)) {
            usedSubOrders.add(p.slotOrder)
        } else {
            subsNeedingOrder.push(p)
        }
    })

    let nextSubOrder = 1
    subsNeedingOrder.forEach(p => {
        while (usedSubOrders.has(nextSubOrder)) nextSubOrder++
        const idx = updated.findIndex(u => u.id === p.id)
        updated[idx] = { ...updated[idx], slotOrder: nextSubOrder }
        usedSubOrders.add(nextSubOrder)
    })

    //Normalize Reserves (1-7)
    const reserves = updated.filter(p => p.rosterSlot === 'RESERVE')
    const usedReserveOrders = new Set<number>()
    const reservesNeedingOrder: PlayerWithDetails[] = []

    reserves.forEach(p => {
        if (p.slotOrder >= 1 && p.slotOrder <= 7 && !usedReserveOrders.has(p.slotOrder)) {
            usedReserveOrders.add(p.slotOrder)
        } else {
            reservesNeedingOrder.push(p)
        }
    })

    let nextReserveOrder = 1
    reservesNeedingOrder.forEach(p => {
        while (usedReserveOrders.has(nextReserveOrder)) nextReserveOrder++
        const idx = updated.findIndex(u => u.id === p.id)
        updated[idx] = { ...updated[idx], slotOrder: nextReserveOrder }
        usedReserveOrders.add(nextReserveOrder)
  })

  return updated
}

type SelectedPlayer = {
    fp: PlayerWithDetails
} | null

export default function SetLineup({ team, onUpdate, targetGameweek, targetGameweekLockTime, sidelinedByPlayerId }: Props) {
  const router = useRouter()
  const [formation, setFormation] = useState<Formation>(team.formation as Formation)
  const [players, setPlayers] = useState(() => normalizeSlotOrder(team.players, team.formation as Formation))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer>(null)
  const [targetSlot, setTargetSlot] = useState<string>('')
  const [replaceId, setReplaceId] = useState<string>('')

  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0)

  const [dropping, setDropping] = useState(false)

  const [now, setNow] = useState(() => new Date())

  // Build slot maps
  const starters = players.filter(p => p.rosterSlot === 'STARTER')
  const subs = players
    .filter(p => p.rosterSlot === 'SUB')
    .sort((a, b) => a.slotOrder - b.slotOrder)
  const reserves = players
    .filter(p => p.rosterSlot === 'RESERVE')
    .sort((a, b) => a.slotOrder - b.slotOrder)
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

      const activePlayerData = updated[activeIndex]
      const activeIsEligible = isPremierLeagueEligible(activePlayerData.player.team?.leagueId)
      const activeIsSidelined = !!sidelinedByPlayerId[activePlayerData.player.id]

      // Block non-eligible players from being dropped onto Starter/Sub/IR Targets
      const targetsRestrictedZone = overId.startsWith('pitch-') || overId.startsWith('sub-') || overId.startsWith('ir-')

      if (!activeIsEligible && targetsRestrictedZone) {
        return prev
      }

      // Block non-sidelined players specifically from IR
      if (overId.startsWith('ir-') && !activeIsSidelined) {
        return prev
      }

      // Dropped onto another player — swap slots
      const overPlayerIndex = updated.findIndex(p => p.id === overId)
      if (overPlayerIndex !== -1) {
        const overSlotType = updated[overPlayerIndex].rosterSlot
        if (!activeIsEligible && ['STARTER', 'SUB', 'IR'].includes(overSlotType)) {
          return prev
        }
        if (overSlotType === 'IR' && !activeIsSidelined) {
          return prev
        }

        const activeSlot = updated[activeIndex].rosterSlot
        const overSlot = updated[overPlayerIndex].rosterSlot
        const activeOrder = updated[activeIndex].slotOrder
        const overOrder = updated[overPlayerIndex].slotOrder

        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: overSlot, slotOrder: overOrder }
        updated[overPlayerIndex] = { ...updated[overPlayerIndex], rosterSlot: activeSlot, slotOrder: activeOrder }
        return updated
      }

      // Dropped onto an empty slot - extract slot index from slotId
      if (overId.startsWith('pitch-')) {
        // slotId format: "pitch-DEF-0" - need to find the global index
        const allRows = getFormationRows(formation)
        let globalIdx = 0
        let found = false
        allRows.forEach(row => {
            row.slots.forEach((_, i) => {
                const slotId = `pitch-${row.label}-${i}`
                if (slotId === overId) found = true
                if (!found) globalIdx++
            })
        })
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'STARTER', slotOrder: globalIdx }
        return updated
      }

      // Dropped onto empty sub slot
      if (overId.startsWith('sub-')) {
        const currentSubs = updated.filter(p => p.rosterSlot === 'SUB' && p.id !== activePlayerId)
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'SUB', slotOrder: currentSubs.length + 1}
        return updated
      }

      // Dropped onto empty reserve slot
      if (overId.startsWith('reserve-')) {
        const currentReserves = updated.filter(p => p.rosterSlot === 'RESERVE' && p.id !== activePlayerId)
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'RESERVE', slotOrder: currentReserves.length + 1}
        return updated
      }

      if (overId.startsWith('ir-')) {
        updated[activeIndex] = { ...updated[activeIndex], rosterSlot: 'IR', slotOrder: 0}
        return updated
      }

      return updated
    })
  }
  
  const starterCount = starters.length
  const subCount = subs.length

  const lockDate = targetGameweekLockTime ? new Date(targetGameweekLockTime) : null
  const isLocked = lockDate ? now >= lockDate: false

  const sensors = useSensors(useSensor(PointerSensor, { 
    activationConstraint: { distance: 8 } 
  }))

  function handlePlayerClick(fp: PlayerWithDetails, e: React.MouseEvent) {
    if (isLocked) return
    e.stopPropagation()
    setSelectedPlayer({ fp })
    setTargetSlot('')
    setReplaceId('')
  }

  function movePlayers(
    playerId: string, 
    targetSlot: string, 
    replaceId?: string,
    slotIndex?: number
) {
    setPlayers(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(p => p.id === playerId)
        if (idx === -1) return prev

        //If replacing, move the replaced player to the moving player's old slot
        if (replaceId) {
            const replaceIdx = updated.findIndex(p => p.id === replaceId)
            if (replaceIdx !== -1) {
                // Incoming player takes the replaced player's exact slot
                const activeSlot = updated[idx].rosterSlot
                const activeOrder = updated[idx].slotOrder
                const replacedSlot = updated[replaceIdx].rosterSlot
                const replacedOrder = updated[replaceIdx].slotOrder

                //Replaced Player takes the incoming player's old slot
                updated[replaceIdx] = {
                    ...updated[replaceIdx], 
                    rosterSlot: replacedSlot,
                    slotOrder: replacedOrder
                }

                updated[idx] = {
                    ...updated[idx],
                    rosterSlot: activeSlot,
                    slotOrder: activeOrder
                }

                return updated
            }
        }

        // Calculate slotOrder for the target slot
        let newSlotOrder = 0
        if (targetSlot === 'STARTER') {
            newSlotOrder = slotIndex ?? 0
        } else if (targetSlot === 'SUB') {
            const currentSubs = updated.filter(p => p.rosterSlot === 'SUB' && p.id !== playerId)
            newSlotOrder = currentSubs.length + 1
        } else if (targetSlot === 'RESERVE') {
            const currentReserves = updated.filter(p => p.rosterSlot === 'RESERVE' && p.id !== playerId)
            newSlotOrder = currentReserves.length + 1
        }

        updated[idx] = { 
            ...updated[idx], 
            rosterSlot: targetSlot as PlayerWithDetails['rosterSlot'],
            slotOrder: newSlotOrder
        }
        return updated
    })
  }

  const handleSave = useCallback(async () => {
    if (isLocked || !targetGameweek) return
    setSaving(true)
    try {
      const res = await fetch('/api/my-team/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fantasyTeamId: team.id,
          gameweekId: targetGameweek.id,
          formation,
          players: players.map(p => ({
            id: p.id,
            playerId: p.playerId,
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
  }, [team, formation, players, onUpdate, isLocked, targetGameweek])

  function assignAllRows(
    rows: { label: string; slots: FormationSlot[] }[], 
    availablePlayers: PlayerWithDetails[]
) {
    const allSlots = rows.flatMap(r => r.slots)
    const slotCount = allSlots.length

    //Initialize Slot Array
    const slotAssignments: (PlayerWithDetails | null)[] = Array(slotCount).fill(null)

    // Players not yet assigned
    const remaining = [...availablePlayers]

    // First Pass - Pin Players with a Valid slotOrder
    availablePlayers.forEach(p => {
        const idx = p.slotOrder
        if (idx >= 0 && idx < slotCount && slotAssignments[idx] === null) {
            slotAssignments[idx] = p
            remaining.splice(remaining.findIndex(r => r.id === p.id), 1)
        }
    })

    // Second Pass - fill empty slots by natural position
    slotAssignments.forEach((assigned, idx) => {
        if (assigned !== null) return
        const slot = allSlots[idx]
        const matchIdx = remaining.findIndex(p => {
            const posType = getPositionType(
                p.player.detailed_position_id,
                p.player.position_id
            )
            return posType !== null && canFillSlot(slot, posType)
        })
        if (matchIdx !== -1) {
            slotAssignments[idx] = remaining[matchIdx]
            remaining.splice(matchIdx, 1)
        }
    })

    // Map back to rows
    let slotIdx = 0
    const result = rows.map(row => ({
        ...row,
        assigned: row.slots.map(() => slotAssignments[slotIdx++])
    }))

    return { result, overflow: remaining}
  }

  const { result: assignedRows, overflow: overflowStarters } = assignAllRows(
    getFormationRows(formation),
    starters
  )

  const [notes, setNotes] = useState(team.lineupNotes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesError, setNotesError] = useState<string | null>()

  const saveNotes = async () => {
    setSavingNotes(true)
    setNotesError(null)
    try {
      const res = await fetch('/api/my-team/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fantasyTeamId: team.id, notes })
      })
      if (!res.ok) throw new Error('Failed to save notes')
      setNotesDirty(false)
    } catch (err) {
      setNotesError('Failed to save = try again')
      console.error('Save Notes Error:', err)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDrop = useCallback(async () => {
    if (!selectedPlayer) return
    const confirmed = window.confirm(`Drop ${selectedPlayer.fp.player.display_name} from your roster`)
    if (!confirmed) return 
    
    setDropping(true)
    try {
      const res = await fetch('/api/fantasy/roster/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fantasyTeamId: team.id,
          playerId: selectedPlayer.fp.player.id
        })
      })
      if (!res.ok) throw new Error('Failed to drop player')

      // Remove immediately from local state so that the UI updates without
      // waiting on a full server round-trip
      setPlayers(prev => prev.filter(p => p.id !== selectedPlayer.fp.id))

      setSelectedPlayer(null)
      router.refresh()
    } catch (err) {
      console.error('Drop player error:', err)
    } finally {
      setDropping(false)
    }
  }, [selectedPlayer, team.id, router])
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  function formatCountdown(target: Date, current: Date): string {
    const diffMs = target.getTime() - current.getTime()
    if (diffMs <= 0) return 'Locked'
    const totalSeconds = Math.floor(diffMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <DndContext
      sensors={isLocked ? [] : sensors}
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
                  disabled={isLocked}
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

        {targetGameweek && lockDate && (
          <div className={`px-4 py-3 rounded-xl border flex flex-col gap-1 ${
            isLocked
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${isLocked ? 'text-red-700' : 'text-blue-700'}`}>
                Lineup for Gameweek {targetGameweek.gameweekNumber}
              </p>
              <p className={`text-sm font-semibold ${isLocked ? 'text-red-700' : 'text-blue-700'}`}>
                {isLocked ? 'Locked' : `Closes in ${formatCountdown(lockDate, now)}`}
              </p>
            </div>
            {targetGameweek.competition !== 'premier_league' && (
              <p className={`text-xs ${isLocked ? 'text-red-600' : 'text-blue-600'}`}>
                {targetGameweek.competition === 'league_cup' ? 'League Cup' : 'Domestic Cup' } week - your entire roster is eligible, slot assignments do not affect scoring. Please save a lineup anyway if you made waiver changes to ensure all players are in lineup.
              </p>
            )}
          </div>
        )}

        {!targetGameweek && (
          <div className="px-4 py-3 rounded-xl border bg-gray-50 border-gray-200">
            <p className="text-sm text-gray-500">No upcoming gameweek to set a lineup for.</p>
          </div>
        )}

        {players.some(fp => !isEligible(fp)) && (
          <div className="px-4 py-3 rounded-xl border bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-700">
              One or more reserved future transfer targets are on your roster.
              They must remain in Reserve and cannot be moved to Starter, Sub, or IR
              until they join a premier league club.
            </p>
          </div>
        )}

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
                {assignedRows.map(row => {
                  return (
                    <div key={row.label} className="flex justify-around items-center py-3">
                        {row.slots.map((slot, i) => {
                            const fp = row.assigned[i]
                            const slotId = `pitch-${row.label}-${i}`
                            const slotPositionLabel = slot.type === 'fixed' ? slot.position : slot.label
                            
                            const naturalPositionType = getPositionType(
                                fp?.player.detailed_position_id,
                                fp?.player.position_id
                            )
                            const slotPosType = slot.type === 'fixed' ? slot.position : null
                            const outOfPosition = slotPosType !== null && naturalPositionType !== slotPosType

                            return fp
                                ? <DraggableWrapper
                                    key={fp.id}
                                    id={fp.id}
                                    onClick={e => handlePlayerClick(fp, e)}
                                >
                                    <PlayerCard
                                        player={fp.player}
                                        positionLabel={slotPositionLabel}
                                        outOfPosition={outOfPosition}
                                        sidelinedInfo={sidelinedByPlayerId[fp.player.id] ?? null}
                                    />
                                </DraggableWrapper>
                                : <EmptySlot key={slotId} slotId={slotId} variant="pitch" slot={slot}/>
                        })}
                    </div>
                  )
                })}
              </div>
              {/* Overflow Starters */}
            {overflowStarters.length > 0 && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-yellow-100 border-b border-yellow-200">
                        <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">
                            Does Not Fit Formation: ({overflowStarters.length})
                        </p>
                    </div>
                    {overflowStarters.map(fp => (
                        <DraggableWrapper
                            key={fp.id}
                            id={fp.id}
                            onClick={e => handlePlayerClick(fp, e)}
                        >
                            <PlayerListRow 
                                player={fp.player}
                                team={fp.player.team}
                                isIR={fp.rosterSlot === 'IR'}
                                size="sm"
                                sidelinedInfo={sidelinedByPlayerId[fp.player.id] ?? null}
                            />
                        </DraggableWrapper>
                    ))}
                </div>
            )}
            </div>

            {/* Notes */}
            <div className="mt-3 bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
                {notesDirty && (
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="text-xs px-3 py-1 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
              <textarea 
                value={notes}
                onChange={e => {
                  setNotes(e.target.value)
                  setNotesDirty(true)
                }}
                placeholder="Jot down notes about your lineup - injuries to watch, players to consider swapping in..."
                rows={4}
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
              />
              {notesError && (
                <p className="text-xs text-red-500 px-3 pb-2">{notesError}</p>
              )}
            </div>
          </div>

          {/* Player Management Panel*/}
          {selectedPlayer && (
            <div className="w-64 flex-shrink-0 bg-white border-gray-100 rounded-xl overlow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-gray-900">
                        {selectedPlayer.fp.player.display_name}
                    </p>
                    <button
                        onClick={() => setSelectedPlayer(null)}
                        className="text-gray-900 hover:text-gray-600"
                    >
                        X
                    </button>
                </div>

                <div className="p-3 flex flex-col gap-2">
                    <p className="text-xs text-gray-900 mb-1">Move to:</p>

                    <div>
                        <select
                            value={targetSlot}
                            onChange={e => {
                                setTargetSlot(e.target.value) 
                                setReplaceId('')
                                if (e.target.value === 'STARTER') {
                                    const allSlots = getFormationSlots(formation)
                                    const usedIndices = new Set(
                                        players.filter(p => p.rosterSlot === 'STARTER').map(p => p.slotOrder)
                                    )
                                    const nextIdx = allSlots.findIndex((_, i) => !usedIndices.has(i))
                                    setTargetSlotIndex(nextIdx === -1 ? 0 : nextIdx)
                                }
                            }}
                            className="w-full px-2 py-1.5 text-gray-900 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600"
                        >
                            <option value="">Select slot...</option>
                            {isEligible(selectedPlayer.fp) && selectedPlayer.fp.rosterSlot !== 'STARTER' && <option value="STARTER">Starter</option>}
                            {isEligible(selectedPlayer.fp) && selectedPlayer.fp.rosterSlot !== 'SUB' && <option value="SUB">Sub</option>}
                            {selectedPlayer.fp.rosterSlot !== 'RESERVE' && <option value="RESERVE">Reserve</option>}
                            {isEligible(selectedPlayer.fp) && selectedPlayer.fp.rosterSlot !== 'IR' && sidelinedByPlayerId[selectedPlayer.fp.player.id] && <option value="IR">IR</option>}
                        </select>
                    </div>

                    {/*Show replace dropdown if slot is full */}
                    {targetSlot === 'STARTER' && starterCount >= 11 && (
                        <div>
                            <p className="text-xs text-gray-900 mb-1">Replace Starter:</p>
                            <select
                                value={replaceId}
                                onChange={e => setReplaceId(e.target.value)}
                                className="w-full px-2 text-gray-900 py-1.5 text-sm border border-gray-200 rounded-lg foucs:outline-none focus:ring-1 focus:ring-green-600"
                            >
                                <option value="">Select player...</option>
                                {starters
                                    .filter(fp => fp.id !== selectedPlayer.fp.id)
                                    .map(fp => (
                                        <option key={fp.id} value={fp.id}>
                                            {fp.player.display_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {targetSlot === 'SUB' && subCount >= 5 && (
                        <div>
                            <p className="text-xs text-gray-900 mb-1">Replace Sub:</p>
                            <select
                                value={replaceId}
                                onChange={e => setReplaceId(e.target.value)}
                                className="w-full px-2 text-gray-900 py-1.5 text-sm border border-gray-200 rounded-lg foucs:outline-none focus:ring-1 focus:ring-green-600"
                            >
                                <option value="">Select player...</option>
                                {subs
                                    .filter(fp => fp.id !== selectedPlayer.fp.id)
                                    .map(fp => (
                                        <option key={fp.id} value={fp.id}>
                                            {fp.player.display_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (!targetSlot) return
                            const needsReplace = 
                                (targetSlot === 'STARTER' && starterCount >= 11) ||
                                (targetSlot === 'SUB' && subCount >= 5)
                            if (needsReplace && !replaceId) return
                            movePlayers(
                                selectedPlayer.fp.id, 
                                targetSlot, 
                                replaceId || undefined,
                                targetSlot === 'STARTER' ? targetSlotIndex : undefined
                            )
                            setSelectedPlayer(null)
                            setTargetSlot('')
                            setReplaceId('')
                        }}
                        disabled={
                            !targetSlot || 
                            (targetSlot === 'STARTER' && starterCount >= 11 && !replaceId) ||
                            (targetSlot === 'SUB' && subCount >= 5 && !replaceId)
                        }
                        className="w-full py-2 text-sm rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        Confirm
                    </button>

                    <button
                      onClick={handleDrop}
                      disabled={dropping}
                      className="w-full py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                    >
                      {dropping ? 'Dropping...' : 'Drop Player'}
                    </button>
                </div>
            </div>
          )}
          

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
                <DraggableWrapper
                    key={fp.id}
                    id={fp.id}
                    onClick={e => handlePlayerClick(fp, e)}
                >
                    <PlayerListRow 
                        player={fp.player}
                        team={fp.player.team}
                        isIR={fp.rosterSlot === 'IR'}
                        size="sm"
                        sidelinedInfo={sidelinedByPlayerId[fp.player.id] ?? null}
                    />
                </DraggableWrapper>
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
                <DraggableWrapper
                    key={fp.id}
                    id={fp.id}
                    onClick={e => handlePlayerClick(fp, e)}
                >
                    <PlayerListRow 
                        player={fp.player}
                        team={fp.player.team}
                        isIR={fp.rosterSlot === 'IR'}
                        size="sm"
                        sidelinedInfo={sidelinedByPlayerId[fp.player.id] ?? null}
                    />
                </DraggableWrapper>
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
                <DraggableWrapper
                    key={fp.id}
                    id={fp.id}
                    onClick={e => handlePlayerClick(fp, e)}
                >
                    <PlayerListRow 
                        player={fp.player}
                        team={fp.player.team}
                        isIR={fp.rosterSlot === 'IR'}
                        size="sm"
                        sidelinedInfo={sidelinedByPlayerId[fp.player.id] ?? null}
                    />
                </DraggableWrapper>
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

    </DndContext>
  )
}