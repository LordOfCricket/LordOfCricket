import { useAnalytics } from '../../hooks/useAnalytics.js'
import { fetchMatchAnalytics } from '../../services/analyticsApi.js'
import LineChart from '../analytics/LineChart.jsx'
import BarChart from '../analytics/BarChart.jsx'
import StatTile from '../analytics/StatTile.jsx'

export default function MatchAnalyticsPanel({ matchId, teams }) {
  const { data, loading, error } = useAnalytics(fetchMatchAnalytics, matchId)

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-24 w-full animate-pulse rounded bg-white/5" />
      </div>
    )
  }
  if (error || !data || !data.available) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
        <p className="text-sm text-slate-400">Not enough data yet for match analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.scoreComparison && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Score Comparison</h3>
          <div className="mt-4">
            <LineChart
              series={[
                { label: teams?.teamA?.name || 'Team A', color: '#34d399', points: data.scoreComparison.teamA.points.map((p) => ({ x: p.over, y: p.cumulativeRuns })) },
                { label: teams?.teamB?.name || 'Team B', color: '#f59e0b', points: data.scoreComparison.teamB.points.map((p) => ({ x: p.over, y: p.cumulativeRuns })) },
              ]}
              xTickLabel={(x) => `Over ${x}`}
              formatY={(v) => `${v} runs`}
            />
          </div>
        </div>
      )}

      {data.innings.map((inn) => (
        <div key={inn.inningsId} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Innings {inn.inningsNumber} — Run-Rate Progression</h3>
          <div className="mt-4">
            <LineChart
              series={[{ label: 'Run Rate', color: '#34d399', points: inn.progression.map((p) => ({ x: p.over, y: p.runRate })) }]}
              xTickLabel={(x) => `Over ${x}`}
              formatY={(v) => v.toFixed(2)}
            />
          </div>

          {inn.phaseMetrics && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Runs by Phase</h4>
              <div className="mt-3">
                <BarChart data={inn.phaseMetrics.map((p) => ({ label: p.phase, value: p.runs }))} formatValue={(v) => v} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {inn.phaseMetrics.map((p) => (
                  <StatTile key={p.phase} label={p.phase.replace(' Phase', '')} value={`${p.runs}/${p.wickets}`} />
                ))}
              </div>
            </div>
          )}

          {inn.highestPartnership && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Highest Partnership</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {inn.highestPartnership.batsmen.map((b) => b.name).join(' & ')} — {inn.highestPartnership.runs} runs ({inn.highestPartnership.balls} balls)
                {inn.highestPartnership.unbeaten && <span className="text-emerald-300">*</span>}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
