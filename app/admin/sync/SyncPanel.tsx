'use client'

import { useState, useCallback } from 'react'

type SyncResult = {
  success: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

type SyncKey = 'league' | 'teams' | 'players'

const SYNC_ACTIONS: { key: SyncKey; label: string; description: string }[] = [
  { key: 'league', label: 'Sync League', description: 'Fetch and upsert league info from Sportmonks' },
  { key: 'teams', label: 'Sync Teams', description: 'Fetch and upsert all teams for the current season' },
  { key: 'players', label: 'Sync Players', description: 'Fetch each team\'s squad and upsert players' },
]

export default function SyncPanel() {
  const [loading, setLoading] = useState<SyncKey | null>(null)
  const [results, setResults] = useState<Record<SyncKey, SyncResult | null>>({
    league: null,
    teams: null,
    players: null,
  })
  const [secret, setSecret] = useState('')

  const runSync = useCallback(async (key: SyncKey) => {
    if (!secret) {
      setResults(prev => ({
        ...prev,
        [key]: { success: false, error: 'Enter the sync secret first' }
      }))
      return
    }

    setLoading(key)
    setResults(prev => ({ ...prev, [key]: null }))

    try {
      const res = await fetch(`/api/sync/${key}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
        },
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [key]: data }))
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: err instanceof Error ? err.message : 'Request failed',
        }
      }))
    } finally {
      setLoading(null)
    }
  }, [secret])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-white">Sportmonks Sync</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Run sync operations against the Sportmonks API.
        </p>
      </div>

      {/* Secret input */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Sync Secret
        </label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Paste your SYNC_SECRET"
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>

      <div className="flex flex-col gap-4">
        {SYNC_ACTIONS.map(action => {
          const result = results[action.key]
          const isLoading = loading === action.key

          return (
            <div
              key={action.key}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
                </div>
                <button
                  onClick={() => runSync(action.key)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors disabled:opacity-50 font-medium flex-shrink-0"
                >
                  {isLoading ? 'Syncing...' : 'Run'}
                </button>
              </div>

              {result && (
                <div className="px-4 py-3">
                  <div className={`flex items-center gap-2 mb-2 ${
                    result.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span className="text-xs font-medium">
                      {result.success ? '✓ Success' : '✗ Failed'}
                    </span>
                  </div>

                  {result.message && (
                    <p className="text-sm text-gray-300 mb-2">{result.message}</p>
                  )}

                  {result.error && (
                    <p className="text-sm text-red-400 mb-2">{result.error}</p>
                  )}

                  {/* Detailed JSON for debugging */}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      View full response
                    </summary>
                    <pre className="text-xs text-gray-400 bg-gray-950 border border-gray-800 rounded-lg p-3 mt-2 overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}