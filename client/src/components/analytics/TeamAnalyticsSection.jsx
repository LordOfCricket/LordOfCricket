import { Link } from 'react-router-dom'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { fetchTeamAnalytics } from '../../services/analyticsApi.js'
import LineChart from './LineChart.jsx'
import StatTile from './StatTile.jsx'

function pct(v) {
  return v == null ? '—' : `${v.toFixed(1)}%`
}
function num(v, digits = 1) {
  return v == null ? '—' : v.toFixed(digits)
}

export default function TeamAnalyticsSection({ teamId }) {
  const { data, loading, error } = useAnalytics(fetchTeamAnalytics, teamId)

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-24 w-full animate-pulse rounded bg-white/5" />
      </div>
    )
  }
  if (error || !data) return null

  if (data.recentForm.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Analytics</h3>
        <p className="mt-2 text-sm text-slate-400">Not enough finalized matches yet for analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Scoring Averages</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Avg Score" value={num(data.averageScore, 1)} />
          <StatTile label="Avg Conceded" value={num(data.averageConceded, 1)} />
          <StatTile label="Batting First Win %" value={pct(data.battingFirstVsChasing.battingFirst.winPercentage)} />
          <StatTile label="Chasing Win %" value={pct(data.battingFirstVsChasing.chasing.winPercentage)} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Batting first: {data.battingFirstVsChasing.battingFirst.wins}/{data.battingFirstVsChasing.battingFirst.matches} won · Chasing:{' '}
          {data.battingFirstVsChasing.chasing.wins}/{data.battingFirstVsChasing.chasing.matches} won
        </p>
      </div>

      {data.runRateTrend.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Run-Rate Trend — Last {data.runRateTrend.length} Matches</h3>
          <div className="mt-4">
            <LineChart
              series={[{ label: 'Run Rate', color: '#34d399', points: data.runRateTrend.map((m, i) => ({ x: i + 1, y: m.runRate })) }]}
              xTickLabel={(x) => data.runRateTrend[x - 1]?.opponent || `Match ${x}`}
              formatY={(v) => v.toFixed(2)}
            />
          </div>
        </div>
      )}

      {data.tournamentPerformance.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Tournament Performance</h3>
          <div className="mt-3 flex flex-col gap-2">
            {data.tournamentPerformance.map((t) => (
              <Link
                key={t.tournamentId}
                to={`/tournaments/${t.publicTournamentId}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <span className="text-sm font-semibold text-white">
                  {t.name} {t.isChampion && <span className="ml-1 text-amber-300">🏆</span>}
                </span>
                <span className="text-xs text-slate-400">
                  {t.played != null ? `${t.won}W-${t.lost}L-${t.tied ?? 0}T · ${t.points ?? 0} pts` : t.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
