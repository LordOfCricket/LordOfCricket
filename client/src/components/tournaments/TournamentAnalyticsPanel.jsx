import { useAnalytics } from '../../hooks/useAnalytics.js'
import { fetchTournamentAnalytics } from '../../services/analyticsApi.js'
import StatTile from '../analytics/StatTile.jsx'

function num(v, digits = 1) {
  return v == null ? '—' : v.toFixed(digits)
}

export default function TournamentAnalyticsPanel({ publicTournamentId }) {
  const { data, loading, error } = useAnalytics(fetchTournamentAnalytics, publicTournamentId)

  if (loading) {
    return <div className="h-16 w-full animate-pulse rounded-2xl bg-white/5" />
  }
  if (error || !data) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-bold text-white">Tournament Analytics</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Finalized Matches" value={`${data.finalizedMatches}/${data.totalFixtures}`} />
        <StatTile label="Total Runs" value={data.totalRuns} />
        <StatTile label="Total Wickets" value={data.totalWickets} />
        <StatTile label="Avg 1st Innings Score" value={num(data.averageFirstInningsScore)} />
        <StatTile label="Highest Team Total" value={data.highestTeamTotal} />
        <StatTile label="Lowest Team Total" value={data.lowestTeamTotal} />
      </div>
    </div>
  )
}
