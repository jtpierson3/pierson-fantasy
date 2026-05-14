'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Tribe = {
  id: string
  name: string
  color: string
}

type Contestant = {
  id: string
  status: string
  survivorPlayer: { name: string; imageUrl: string | null }
  tribeMemberships: { tribe: Tribe; isCurrent: boolean }[]
}

type ChallengeTeam = {
  id: string
  name: string | null
  color: string | null
  contestants: Contestant[]
  result: { placement: number } | null
}

type Challenge = {
  id: string
  name: string | null
  type: string
  isIndividual: boolean
  isFiremaking: boolean
  reward: string | null
  order: number
  teams: ChallengeTeam[]
  results: {
    id: string
    placement: number
    contestantId: string | null
    teamId: string | null
    contestant: Contestant | null
  }[]
}

type Episode = {
  id: string
  survivorSeasonId: string
  challenges: Challenge[]
  survivorSeason: { tribes: Tribe[] }
}

type Props = {
  episode: Episode
  contestants: Contestant[]
}

type ChallengeForm = {
  name: string
  type: string
  isIndividual: boolean
  isFiremaking: boolean
  reward: string
}

const emptyForm: ChallengeForm = {
  name: '',
  type: 'immunity',
  isIndividual: true,
  isFiremaking: false,
  reward: '',
}

type ChallengeBody = {
  episodeId: string
  name: string
  type: string
  isIndividual: boolean
  isFiremaking: boolean
  reward: string | null
  order: number
  tribeIds?: string[]
  customTeams?: CustomTeam[]
}

type CustomTeam = {
  name: string
  color: string
  contestantIds: string[]
}

const TEAM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
  <div className="flex items-center gap-3">
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
    <span className="text-sm text-gray-300">{label}</span>
  </div>
)

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void
} | null

export default function ChallengesTab({ episode, contestants }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<ChallengeForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmDialog>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Team setup
  const [useExistingTribes, setUseExistingTribes] = useState(true)
  const [selectedTribeIds, setSelectedTribeIds] = useState<string[]>([])
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([
    { name: 'Team 1', color: TEAM_COLORS[0], contestantIds: [] },
    { name: 'Team 2', color: TEAM_COLORS[1], contestantIds: [] },
  ])

  // Winners
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<Set<string>>(new Set())
  const [selectedWinnerTeamId, setSelectedWinnerTeamId] = useState<string>('')
  const [savingWinners, setSavingWinners] = useState<string | null>(null)

  const tribes = episode.survivorSeason?.tribes ?? []

  const handleCreateChallenge = useCallback(async () => {
    setFormLoading(true)
    setFormError(null)
    try {
      const body: ChallengeBody = {
        episodeId: episode.id,
        ...form,
        reward: form.reward || null,
        order: episode.challenges.length + 1,
      }

      // Add team data if team challenge
      if (!form.isIndividual) {
        if (useExistingTribes) {
          body.tribeIds = selectedTribeIds
        } else {
          body.customTeams = customTeams
        }
      }

      const res = await fetch('/api/admin/survivor/challenges/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create challenge')
      setShowAdd(false)
      setForm(emptyForm)
      setSelectedTribeIds([])
      setCustomTeams([
        { name: 'Team 1', color: TEAM_COLORS[0], contestantIds: [] },
        { name: 'Team 2', color: TEAM_COLORS[1], contestantIds: [] },
      ])
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create challenge')
    } finally {
      setFormLoading(false)
    }
  }, [form, episode.id, episode.challenges.length, useExistingTribes, selectedTribeIds, customTeams, router])

  const handleDeleteChallenge = useCallback((challenge: Challenge) => {
    setConfirm({
      title: 'Delete challenge',
      message: `Delete this ${challenge.type} challenge? All results will be removed.`,
      onConfirm: async () => {
        setConfirmLoading(true)
        try {
          const res = await fetch('/api/admin/survivor/challenges/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: challenge.id })
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

  const handleSaveWinners = useCallback(async (challenge: Challenge) => {
    setSavingWinners(challenge.id)
    try {
      const body = challenge.isIndividual
        ? { challengeId: challenge.id, contestantIds: Array.from(selectedWinnerIds) }
        : { challengeId: challenge.id, winningTeamId: selectedWinnerTeamId }

      const res = await fetch('/api/admin/survivor/challenges/set-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to save winners')
      setSelectedWinnerIds(new Set())
      setSelectedWinnerTeamId('')
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSavingWinners(null)
    }
  }, [selectedWinnerIds, selectedWinnerTeamId, router])

  const toggleTribe = (tribeId: string) => {
    setSelectedTribeIds(prev =>
      prev.includes(tribeId)
        ? prev.filter(id => id !== tribeId)
        : [...prev, tribeId]
    )
  }

  const toggleContestantInTeam = (teamIndex: number, contestantId: string) => {
    setCustomTeams(prev => prev.map((team, i) => {
      if (i !== teamIndex) {
        // Remove from other teams
        return { ...team, contestantIds: team.contestantIds.filter(id => id !== contestantId) }
      }
      const has = team.contestantIds.includes(contestantId)
      return {
        ...team,
        contestantIds: has
          ? team.contestantIds.filter(id => id !== contestantId)
          : [...team.contestantIds, contestantId]
      }
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{episode.challenges.length} challenges</p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors font-medium"
        >
          + Add Challenge
        </button>
      </div>

      {episode.challenges.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No challenges yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {episode.challenges.map(challenge => (
          <div key={challenge.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-400 border border-blue-700 font-medium capitalize">
                  {challenge.type}
                </span>
                {challenge.isIndividual ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    Individual
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    Team
                  </span>
                )}
                {challenge.isFiremaking && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900 text-orange-400 border border-orange-700">
                    🔥 Firemaking
                  </span>
                )}
                <p className="text-sm font-medium text-white">
                  {challenge.name || `${challenge.type} challenge`}
                </p>
                {challenge.reward && (
                  <p className="text-xs text-gray-400">🎁 {challenge.reward}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteChallenge(challenge)}
                className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-800 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Teams display */}
            {!challenge.isIndividual && challenge.teams.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Teams</p>
                <div className="flex gap-3 flex-wrap">
                  {challenge.teams.map(team => {
                    const isWinner = challenge.results.some(
                      r => r.teamId === team.id && r.placement === 1
                    )
                    return (
                      <div
                        key={team.id}
                        className={`border rounded-lg p-2 min-w-[120px] ${
                          isWinner
                            ? 'border-green-600 bg-green-900/20'
                            : 'border-gray-700 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {team.color && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                          )}
                          <p className="text-xs font-medium text-white">{team.name ?? 'Team'}</p>
                          {isWinner && <span className="text-xs text-green-400">🏆</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {team.contestants.map(c => (
                            <span key={c.id} className="text-xs text-gray-400">
                              {c.survivorPlayer.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Winners */}
            <div className="p-4">
              {/* Existing winners */}
              {challenge.results.filter(r => r.placement === 1).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <p className="text-xs text-gray-400 w-full">Current winner(s):</p>
                  {challenge.results
                    .filter(r => r.placement === 1)
                    .map(r => (
                      <div key={r.id} className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-3 py-1.5">
                        <span className="text-sm text-green-400">
                          {r.contestant?.survivorPlayer.name ?? 'Team winner'}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Set winner */}
              <p className="text-xs text-gray-400 mb-2">Set winner:</p>

              {challenge.isIndividual ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {contestants.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedWinnerIds(prev => {
                          const next = new Set(prev)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors ${
                        selectedWinnerIds.has(c.id)
                          ? 'bg-green-900/40 border-green-600 text-green-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {c.survivorPlayer.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap mb-3">
                  {challenge.teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedWinnerTeamId(team.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        selectedWinnerTeamId === team.id
                          ? 'bg-green-900/40 border-green-600 text-green-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {team.color && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                      )}
                      {team.name ?? 'Team'}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleSaveWinners(challenge)}
                disabled={
                  savingWinners === challenge.id ||
                  (challenge.isIndividual ? selectedWinnerIds.size === 0 : !selectedWinnerTeamId)
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {savingWinners === challenge.id ? 'Saving...' : 'Set winner(s)'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Challenge Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-white mb-1">Add Challenge</h3>
            <p className="text-sm text-gray-400 mb-6">Add a challenge from this episode.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Challenge name <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Muddy Waters"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  <option value="immunity">Immunity</option>
                  <option value="reward">Reward</option>
                  <option value="combined">Combined (Immunity + Reward)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Reward <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.reward}
                  onChange={e => setForm(prev => ({ ...prev, reward: e.target.value }))}
                  placeholder="e.g. Steak dinner"
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Toggle
                  label="Individual challenge"
                  value={form.isIndividual}
                  onChange={() => setForm(prev => ({ ...prev, isIndividual: !prev.isIndividual }))}
                />
                <Toggle
                  label="Firemaking challenge"
                  value={form.isFiremaking}
                  onChange={() => setForm(prev => ({ ...prev, isFiremaking: !prev.isFiremaking }))}
                />
              </div>

              {/* Team setup */}
              {!form.isIndividual && (
                <div className="border border-gray-700 rounded-lg p-4 flex flex-col gap-4">
                  <p className="text-sm font-medium text-white">Team Setup</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseExistingTribes(true)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        useExistingTribes
                          ? 'bg-green-900 border-green-700 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Use existing tribes
                    </button>
                    <button
                      onClick={() => setUseExistingTribes(false)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        !useExistingTribes
                          ? 'bg-green-900 border-green-700 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Custom teams
                    </button>
                  </div>

                  {useExistingTribes ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Select tribes competing:</p>
                      <div className="flex flex-wrap gap-2">
                        {tribes.map((tribe: Tribe) => (
                          <button
                            key={tribe.id}
                            onClick={() => toggleTribe(tribe.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                              selectedTribeIds.includes(tribe.id)
                                ? 'border-white/50 bg-white/10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                            style={selectedTribeIds.includes(tribe.id) ? { borderColor: tribe.color } : {}}
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tribe.color }} />
                            <span className="text-white">{tribe.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {customTeams.map((team, teamIndex) => (
                        <div key={teamIndex} className="border border-gray-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                            <input
                              type="text"
                              value={team.name}
                              onChange={e => setCustomTeams(prev => prev.map((t, i) =>
                                i === teamIndex ? { ...t, name: e.target.value } : t
                              ))}
                              className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-green-600"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mb-2">Members:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {contestants.map(c => (
                              <button
                                key={c.id}
                                onClick={() => toggleContestantInTeam(teamIndex, c.id)}
                                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                                  team.contestantIds.includes(c.id)
                                    ? 'border-white/30 text-white'
                                    : 'border-gray-700 text-gray-500 hover:border-gray-600'
                                }`}
                                style={team.contestantIds.includes(c.id) ? { borderColor: team.color } : {}}
                              >
                                {c.survivorPlayer.name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setCustomTeams(prev => [...prev, {
                          name: `Team ${prev.length + 1}`,
                          color: TEAM_COLORS[prev.length % TEAM_COLORS.length],
                          contestantIds: [],
                        }])}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                      >
                        + Add Team
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowAdd(false); setFormError(null) }}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChallenge}
                disabled={formLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
              >
                {formLoading ? 'Adding...' : 'Add Challenge'}
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