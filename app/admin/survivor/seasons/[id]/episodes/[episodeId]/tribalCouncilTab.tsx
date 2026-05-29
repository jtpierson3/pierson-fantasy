'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Contestant = {
  id: string
  status: string
  imageUrl: string | null
  survivorPlayer: { name: string; }
  tribeMemberships: { tribe: { name: string; color: string } }[]
}

type VotingRecord = {
  id: string
  voterId: string
  votedForId: string
  isRevoked: boolean
  voter: { survivorPlayer: { name: string } }
  votedFor: { survivorPlayer: { name: string } }
}

type Advantage = {
  type: string
  playedById: string
  playedOnId: string | null
}

type TribalCouncil = {
  id: string
  order: number
  isFiremaking: boolean
  isFinalTribal: boolean
  notes: string | null
  eliminatedId: string | null
  eliminated: { survivorPlayer: { name: string } } | null
  votes: VotingRecord[]
}

type Episode = {
  id: string
  tribalCouncils: TribalCouncil[]
}

type Props = {
  episode: Episode
  contestants: Contestant[]
}

const ADVANTAGE_TYPES = [
  { value: 'idol', label: 'Hidden Immunity Idol', revokesVotes: true },
  { value: 'extra_vote', label: 'Extra Vote', revokesVotes: false },
  { value: 'shot_in_dark', label: 'Shot in the Dark', revokesVotes: false },
  { value: 'steal_a_vote', label: 'Steal a Vote', revokesVotes: false },
  { value: 'knowledge_is_power', label: 'Knowledge is Power', revokesVotes: false },
  { value: 'immunity_necklace', label: 'Immunity Necklace (given away)', revokesVotes: true },
  { value: 'nullifier', label: 'Nullifier', revokesVotes: true },
  { value: 'other', label: 'Other', revokesVotes: false },
]

type Step = 'advantages' | 'votes' | 'eliminated'

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function TribalCouncilTab({ episode, contestants }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [isFiremaking, setIsFiremaking] = useState(false)
  const [isFinalTribal, setIsFinalTribal] = useState(false)
  const [notes, setNotes] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Active tribal entry state
  const [activeTribalId, setActiveTribalId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('advantages')

  // Step 1 — Advantages
  const [advantages, setAdvantages] = useState<Advantage[]>([])

  // Step 2 — Votes
  const [votes, setVotes] = useState<Record<string, string[]>>({}) // voterId -> votedForId[]

  // Step 3 — Eliminated
  const [eliminatedId, setEliminatedId] = useState<string>('')
  const [savingVotes, setSavingVotes] = useState(false)

  // Derived state from advantages
  const immunePlayers = useMemo(() => {
    const immune = new Set<string>()
    advantages.forEach(a => {
      if (['idol', 'immunity_necklace', 'nullifier'].includes(a.type) && a.playedOnId) {
        immune.add(a.playedOnId)
      }
      if (a.type === 'shot_in_dark') {
        immune.add(a.playedById)
      }
    })
    return immune
  }, [advantages])

  const noVotePlayers = useMemo(() => {
    const noVote = new Set<string>()
    advantages.forEach(a => {
      if (a.type === 'shot_in_dark') noVote.add(a.playedById)
      if (a.type === 'steal_a_vote' && a.playedOnId) noVote.add(a.playedOnId)
    })
    return noVote
  }, [advantages])

  const extraVotePlayers = useMemo(() => {
    const extra = new Set<string>()
    advantages.forEach(a => {
      if (a.type === 'extra_vote') extra.add(a.playedById)
      if (a.type === 'steal_a_vote') extra.add(a.playedById)
    })
    return extra
  }, [advantages])

  // Vote tally grouped by target
  const voteTally = useMemo(() => {
    const tally: Record<string, { votes: { voterId: string; isRevoked: boolean }[] }> = {}
    Object.entries(votes).forEach(([voterId, targets]) => {
      targets.forEach(target => {
        if (!target) return
        if (!tally[target]) tally[target] = { votes: [] }
        tally[target].votes.push({
          voterId,
          isRevoked: immunePlayers.has(target),
        })
      })
    })
    return tally
  }, [votes, immunePlayers])

  const effectiveVoteTally = useMemo(() => {
    return Object.entries(voteTally).map(([targetId, { votes }]) => ({
      targetId,
      total: votes.filter(v => !v.isRevoked).length,
      votes,
    })).sort((a, b) => b.total - a.total)
  }, [voteTally])

  function openTribal(tribal: TribalCouncil) {
    setActiveTribalId(tribal.id)
    setStep('advantages')
    setAdvantages([])
    setVotes({})
    setEliminatedId(tribal.eliminatedId ?? '')
  }

  function closeTribal() {
    setActiveTribalId(null)
    setStep('advantages')
    setAdvantages([])
    setVotes({})
    setEliminatedId('')
  }

  function addAdvantage() {
    setAdvantages(prev => [...prev, {
      type: 'idol',
      playedById: contestants[0]?.id ?? '',
      playedOnId: contestants[0]?.id ?? '',
    }])
  }

  function updateAdvantage(index: number, field: keyof Advantage, value: string | null) {
    setAdvantages(prev => prev.map((a, i) =>
      i === index ? { ...a, [field]: value } : a
    ))
  }

  function removeAdvantage(index: number) {
    setAdvantages(prev => prev.filter((_, i) => i !== index))
  }

  function setVote(voterId: string, voteIndex: number, targetId: string) {
    setVotes(prev => {
      const current = prev[voterId] ? [...prev[voterId]] : ['']
      current[voteIndex] = targetId
      return { ...prev, [voterId]: current }
    })
  }

  const handleSaveVotes = useCallback(async (tribalId: string) => {
    setSavingVotes(true)
    try {
      const flatVotes: { voterId: string; votedForId: string; isRevoked: boolean }[] = []

      Object.entries(votes).forEach(([voterId, targets]) => {
        targets.forEach(target => {
          if (!target) return
          flatVotes.push({
            voterId,
            votedForId: target,
            isRevoked: immunePlayers.has(target),
          })
        })
      })

      const res = await fetch('/api/admin/survivor/tribal/save-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribalCouncilId: tribalId,
          votes: flatVotes,
          eliminatedId: eliminatedId || null,
          advantages,
        })
      })

      if (!res.ok) throw new Error('Failed to save votes')
      closeTribal()
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSavingVotes(false)
    }
  }, [votes, eliminatedId, advantages, immunePlayers, router])

  const handleCreateTribal = useCallback(async () => {
    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/survivor/tribal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          order: episode.tribalCouncils.length + 1,
          isFiremaking,
          isFinalTribal,
          notes: notes || null,
        })
      })
      if (!res.ok) throw new Error('Failed to create tribal council')
      setShowAdd(false)
      setIsFiremaking(false)
      setIsFinalTribal(false)
      setNotes('')
      router.refresh()
    } catch {
      // handle error
    } finally {
      setFormLoading(false)
    }
  }, [episode.id, episode.tribalCouncils.length, isFiremaking, isFinalTribal, notes, router])

  const handleDeleteTribal = useCallback((tribal: TribalCouncil) => {
    setConfirm({
      title: 'Delete tribal council',
      message: 'Delete this tribal council? All votes will be removed.',
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/tribal/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tribalCouncilId: tribal.id })
          })
          if (!res.ok) throw new Error('Failed to delete')
          router.refresh()
        } catch {
          // handle error
        } finally {
          setConfirmLoading(false)
          setConfirm(null)
        }
      }
    })
  }, [router])

  const getContestantName = (id: string) =>
    contestants.find(c => c.id === id)?.survivorPlayer.name ?? 'Unknown'

  const STEPS: { id: Step; label: string }[] = [
    { id: 'advantages', label: '1. Advantages' },
    { id: 'votes', label: '2. Votes' },
    { id: 'eliminated', label: '3. Eliminated' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{episode.tribalCouncils.length} tribal councils</p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Tribal Council
        </button>
      </div>

      {episode.tribalCouncils.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No tribal councils yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {episode.tribalCouncils.map(tribal => (
          <div key={tribal.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">
                  Tribal Council {tribal.order}
                </span>
                {tribal.isFiremaking && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400 border border-orange-700">
                    🔥 Firemaking
                  </span>
                )}
                {tribal.isFinalTribal && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-400 border border-yellow-700">
                    Final Tribal
                  </span>
                )}
                {tribal.eliminated && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400 border border-red-700">
                    Eliminated: {tribal.eliminated.survivorPlayer.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => activeTribalId === tribal.id ? closeTribal() : openTribal(tribal)}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  {activeTribalId === tribal.id ? 'Close' : 'Enter Votes'}
                </button>
                <button
                  onClick={() => handleDeleteTribal(tribal)}
                  className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Existing votes grouped by target */}
            {tribal.votes.length > 0 && activeTribalId !== tribal.id && (
              <div className="p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Vote Results</p>
                {(() => {
                  const grouped: Record<string, VotingRecord[]> = {}
                  tribal.votes.forEach(v => {
                    if (!grouped[v.votedForId]) grouped[v.votedForId] = []
                    grouped[v.votedForId].push(v)
                  })
                  return Object.entries(grouped)
                    .sort(([, a], [, b]) =>
                      b.filter(v => !v.isRevoked).length - a.filter(v => !v.isRevoked).length
                    )
                    .map(([targetId, targetVotes]) => {
                      const effective = targetVotes.filter(v => !v.isRevoked).length
                      const isEliminated = tribal.eliminatedId === targetId
                      return (
                        <div key={targetId} className="mb-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-sm font-medium ${isEliminated ? 'text-red-400' : 'text-white'}`}>
                              {getContestantName(targetId)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {effective} vote{effective !== 1 ? 's' : ''}
                              {targetVotes.some(v => v.isRevoked) && (
                                <span className="text-orange-400 ml-1">
                                  ({targetVotes.filter(v => v.isRevoked).length} revoked)
                                </span>
                              )}
                            </span>
                            {isEliminated && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900 text-red-400 border border-red-700">
                                Voted out
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-3">
                            {targetVotes.map(v => (
                              <span
                                key={v.id}
                                className={`text-xs px-2 py-0.5 rounded-lg border ${
                                  v.isRevoked
                                    ? 'bg-gray-800/30 text-gray-600 border-gray-800 line-through'
                                    : 'bg-gray-800 text-gray-300 border-gray-700'
                                }`}
                              >
                                {v.voter.survivorPlayer.name.split(' ')[0]}
                                {v.isRevoked && ' 🔮'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>
            )}

            {/* Vote entry — 3 step flow */}
            {activeTribalId === tribal.id && (
              <div className="p-4">
                {/* Step indicator */}
                <div className="flex gap-2 mb-6">
                  {STEPS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStep(s.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        step === s.id
                          ? 'bg-green-900 border-green-700 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Step 1 — Advantages */}
                {step === 'advantages' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-300">Advantages played this tribal</p>
                      <button
                        onClick={addAdvantage}
                        className="px-3 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                      >
                        + Add
                      </button>
                    </div>

                    {advantages.length === 0 && (
                      <p className="text-sm text-gray-500 mb-4">No advantages played — click Add if any were played.</p>
                    )}

                    <div className="flex flex-col gap-3 mb-4">
                      {advantages.map((adv, i) => {
                        const advType = ADVANTAGE_TYPES.find(a => a.value === adv.type)
                        const needsTarget = ['idol', 'immunity_necklace', 'nullifier', 'steal_a_vote', 'knowledge_is_power'].includes(adv.type)

                        return (
                          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Type</label>
                                <select
                                  value={adv.type}
                                  onChange={e => updateAdvantage(i, 'type', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                                >
                                  {ADVANTAGE_TYPES.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Played by</label>
                                <select
                                  value={adv.playedById}
                                  onChange={e => updateAdvantage(i, 'playedById', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                                >
                                  {contestants.map(c => (
                                    <option key={c.id} value={c.id}>{c.survivorPlayer.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {needsTarget && (
                              <div className="mb-2">
                                <label className="block text-xs text-gray-400 mb-1">
                                  {adv.type === 'steal_a_vote' ? 'Stolen from' :
                                   adv.type === 'knowledge_is_power' ? 'Used on' :
                                   'Played on'}
                                </label>
                                <select
                                  value={adv.playedOnId ?? ''}
                                  onChange={e => updateAdvantage(i, 'playedOnId', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                                >
                                  <option value="">Select...</option>
                                  {contestants.map(c => (
                                    <option key={c.id} value={c.id}>{c.survivorPlayer.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {advType?.revokesVotes && adv.playedOnId && (
                              <p className="text-xs text-orange-400 mt-1">
                                🔮 Votes against {getContestantName(adv.playedOnId)} will be revoked
                              </p>
                            )}

                            {adv.type === 'shot_in_dark' && (
                              <p className="text-xs text-blue-400 mt-1">
                                🎲 {getContestantName(adv.playedById)} is safe but loses their vote
                              </p>
                            )}

                            {adv.type === 'steal_a_vote' && adv.playedOnId && (
                              <p className="text-xs text-purple-400 mt-1">
                                🃏 {getContestantName(adv.playedOnId)} loses their vote · {getContestantName(adv.playedById)} gets an extra vote
                              </p>
                            )}

                            <button
                              onClick={() => removeAdvantage(i)}
                              className="text-xs text-red-400 hover:text-red-300 mt-2"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setStep('votes')}
                      className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                    >
                      Next: Enter Votes →
                    </button>
                  </div>
                )}

                {/* Step 2 — Votes */}
                {step === 'votes' && (
                  <div>
                    <p className="text-sm text-gray-300 mb-3">Who voted for whom?</p>

                    <div className="flex flex-col gap-2 mb-4">
                      {contestants
                        .filter(c => c.status !== 'eliminated')
                        .map(contestant => {
                          const hasNoVote = noVotePlayers.has(contestant.id)
                          const hasExtraVote = extraVotePlayers.has(contestant.id)
                          const currentVotes = votes[contestant.id] ?? ['']
                          const voteEntries = hasExtraVote
                            ? (currentVotes.length < 2 ? [...currentVotes, ''] : currentVotes)
                            : [currentVotes[0] ?? '']

                          return (
                            <div key={contestant.id} className={`flex items-start gap-3 p-2 rounded-lg ${
                              hasNoVote ? 'opacity-40' : ''
                            }`}>
                              <span className="text-sm text-gray-300 w-28 truncate flex-shrink-0 pt-1.5">
                                {contestant.survivorPlayer.name.split(' ')[0]}
                                {hasExtraVote && <span className="text-purple-400 ml-1">+1</span>}
                                {hasNoVote && <span className="text-gray-500 ml-1">(no vote)</span>}
                              </span>
                              <div className="flex flex-col gap-1.5 flex-1">
                                {voteEntries.map((vote, voteIndex) => (
                                  <div key={voteIndex} className="flex items-center gap-2">
                                    <span className="text-gray-600 text-xs">
                                      {hasExtraVote ? `Vote ${voteIndex + 1}:` : 'voted for'}
                                    </span>
                                    <select
                                      value={vote}
                                      disabled={hasNoVote}
                                      onChange={e => setVote(contestant.id, voteIndex, e.target.value)}
                                      className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-40"
                                    >
                                      <option value="">— did not vote —</option>
                                      {contestants
                                        .filter(c => c.id !== contestant.id)
                                        .map(c => (
                                          <option key={c.id} value={c.id}>
                                            {c.survivorPlayer.name}
                                            {immunePlayers.has(c.id) ? ' 🔮' : ''}
                                          </option>
                                        ))
                                      }
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    {/* Live tally preview */}
                    {effectiveVoteTally.length > 0 && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Live Tally</p>
                        {effectiveVoteTally.map(({ targetId, total, votes: targetVotes }) => (
                          <div key={targetId} className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-white w-28 truncate">
                              {getContestantName(targetId)}
                            </span>
                            <div className="flex gap-1">
                              {targetVotes.map((v, i) => (
                                <div
                                  key={i}
                                  className={`w-5 h-5 rounded border text-xs flex items-center justify-center ${
                                    v.isRevoked
                                      ? 'border-orange-700 bg-orange-900/30 text-orange-400'
                                      : 'border-gray-600 bg-gray-700 text-gray-300'
                                  }`}
                                  title={`${getContestantName(v.voterId)}${v.isRevoked ? ' (revoked)' : ''}`}
                                >
                                  {v.isRevoked ? '✗' : '✓'}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">
                              {total} effective
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('advantages')}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setStep('eliminated')}
                        className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
                      >
                        Next: Eliminated →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Eliminated */}
                {step === 'eliminated' && (
                  <div>
                    <p className="text-sm text-gray-300 mb-3">Who was voted out?</p>

                    {/* Final vote summary */}
                    {effectiveVoteTally.length > 0 && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Final Vote Count</p>
                        {effectiveVoteTally.map(({ targetId, total, votes: targetVotes }) => (
                          <div key={targetId} className="mb-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium text-white">
                                {getContestantName(targetId)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {total} vote{total !== 1 ? 's' : ''}
                                {targetVotes.some(v => v.isRevoked) && (
                                  <span className="text-orange-400 ml-1">
                                    ({targetVotes.filter(v => v.isRevoked).length} revoked)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 ml-3">
                              {targetVotes.map((v, i) => (
                                <span
                                  key={i}
                                  className={`text-xs px-2 py-0.5 rounded-lg border ${
                                    v.isRevoked
                                      ? 'bg-gray-800/30 text-gray-600 border-gray-800 line-through'
                                      : 'bg-gray-800 text-gray-300 border-gray-700'
                                  }`}
                                >
                                  {getContestantName(v.voterId).split(' ')[0]}
                                  {v.isRevoked && ' 🔮'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Eliminated contestant
                      </label>
                      <select
                        value={eliminatedId}
                        onChange={e => setEliminatedId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                      >
                        <option value="">— no elimination (tie vote, etc.) —</option>
                        {contestants
                          .filter(c => c.status !== 'eliminated')
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.survivorPlayer.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('votes')}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => handleSaveVotes(tribal.id)}
                        disabled={savingVotes}
                        className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                      >
                        {savingVotes ? 'Saving...' : 'Save Tribal Council'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Tribal Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-1">Add Tribal Council</h3>
            <p className="text-sm text-gray-400 mb-6">Add a tribal council from this episode.</p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFiremaking(prev => !prev)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isFiremaking ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFiremaking ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-300">Firemaking tribal</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFinalTribal(prev => !prev)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isFinalTribal ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFinalTribal ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-300">Final tribal council</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Notes <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any notable events at tribal..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowAdd(false)}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTribal}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {formLoading ? 'Adding...' : 'Add Tribal Council'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-medium text-white mb-2">{confirm.title}</h3>
            <p className="text-sm text-gray-400 mb-6">{confirm.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)} disabled={confirmLoading} className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={confirm.onConfirm} disabled={confirmLoading} className="px-4 py-2 text-sm rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {confirmLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}