export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Gameweek 32 overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'GW Points', value: '74', delta: '+12 vs avg' },
          { label: 'Total Points', value: '1,842', delta: '3rd in league' },
          { label: 'League Rank', value: '3rd', delta: '-1 this week' },
          { label: 'Team Value', value: '£83.4m', delta: '+£0.4m' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className="text-2xl font-medium text-gray-900">{stat.value}</p>
            <p className="text-xs text-green-700 mt-1">{stat.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Top performers</h2>
          <p className="text-sm text-gray-400">Connect your team to see stats</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-4">League standings</h2>
          <p className="text-sm text-gray-400">Connect your league to see standings</p>
        </div>
      </div>
    </div>
  )
}