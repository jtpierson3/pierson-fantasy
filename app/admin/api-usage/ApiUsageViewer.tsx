'use client'

type SourceCount = { source: string; count: number }
type MonthlySummary = { year: number; month: number; source: string; totalCalls: number }
type LogEntry = {
  id: string
  endpoint: string
  source: string
  triggeredBy: string | null
  remainingAfterCall: number | null
  calledAt: string
}

type Props = {
  currentMonthBySource: SourceCount[]
  currentMonthTotal: number
  remaining: number | null
  remainingAsOf: string | null
  historicalSummaries: MonthlySummary[]
  recentLogs: LogEntry[]
}

const MONTHLY_BUDGET = 2000

function sourceLabel(source: string): string {
  return source
    .toLowerCase()
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1)
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

export default function ApiUsageViewer({
  currentMonthBySource,
  currentMonthTotal,
  remaining,
  remainingAsOf,
  historicalSummaries,
  recentLogs,
}: Props) {
  const usagePercent = Math.min(100, Math.round((currentMonthTotal / MONTHLY_BUDGET) * 100))

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-medium text-gray-900 mb-1">Sportmonks API Usage</h1>
      <p className="text-sm text-gray-500 mb-6">Live diagnostics for API call volume and quota.</p>

      {/* Current month overview */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-900">This Month</p>
          <p className="text-sm text-gray-500">{currentMonthTotal} / {MONTHLY_BUDGET} calls (our count)</p>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${usagePercent > 85 ? 'bg-red-500' : usagePercent > 60 ? 'bg-yellow-500' : 'bg-green-600'}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        {remaining !== null && (
          <p className="text-xs text-gray-400">
            Sportmonks reports {remaining} calls remaining
            {remainingAsOf && ` (as of ${new Date(remainingAsOf).toLocaleString()})`}
          </p>
        )}
      </div>

      {/* By source breakdown */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">This Month by Source</p>
        </div>
        {currentMonthBySource.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">No calls yet this month.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...currentMonthBySource]
              .sort((a, b) => b.count - a.count)
              .map(s => (
                <div key={s.source} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700">{sourceLabel(s.source)}</span>
                  <span className="text-sm font-medium text-gray-900">{s.count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Historical trend */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Historical Monthly Totals</p>
        </div>
        {historicalSummaries.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">
            No historical data yet — summaries appear once logs are rolled up (3+ months old).
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {historicalSummaries.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">
                  {monthLabel(s.year, s.month)} · {sourceLabel(s.source)}
                </span>
                <span className="text-sm font-medium text-gray-900">{s.totalCalls}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Recent Calls</p>
        </div>
        <div className="divide-y divide-gray-50">
          {recentLogs.map(log => (
            <div key={log.id} className="px-4 py-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{sourceLabel(log.source)}</span>
                <span className="text-gray-400">{new Date(log.calledAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-400 mt-0.5">
                {log.endpoint}
                {log.triggeredBy && ` · ${log.triggeredBy}`}
                {log.remainingAfterCall !== null && ` · ${log.remainingAfterCall} remaining`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}