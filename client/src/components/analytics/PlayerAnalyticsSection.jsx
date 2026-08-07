import { useAnalytics } from '../../hooks/useAnalytics.js'
import { fetchPlayerAnalytics } from '../../services/analyticsApi.js'
import LineChart from './LineChart.jsx'
import BarChart from './BarChart.jsx'
import StatTile from './StatTile.jsx'

function pct(v) {
  return v == null ? '—' : `${v.toFixed(1)}%`
}
function num(v, digits = 0) {
  return v == null ? '—' : v.toFixed(digits)
}

export default function PlayerAnalyticsSection({ publicPlayerId }) {
  const { data, loading, error } = useAnalytics(fetchPlayerAnalytics, publicPlayerId)

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-24 w-full animate-pulse rounded bg-white/5" />
      </div>
    )
  }
  if (error || !data) return null

  const hasAnyData = data.recentForm.length > 0
  if (!hasAnyData) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Analytics</h3>
        <p className="mt-2 text-sm text-slate-400">Not enough official match history yet for analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.battingTrend.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Batting Trend — Last {data.battingTrend.length} Innings</h3>
          <div className="mt-4">
            <LineChart
              series={[{ label: 'Runs', color: '#34d399', points: data.battingTrend.map((m, i) => ({ x: i + 1, y: m.runs })) }]}
              xTickLabel={(x) => data.battingTrend[x - 1]?.opponent || `Match ${x}`}
              formatY={(v) => `${v} runs`}
            />
          </div>
        </div>
      )}

      {data.bowlingTrend.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Bowling Trend — Last {data.bowlingTrend.length} Innings</h3>
          <div className="mt-4">
            <LineChart
              series={[{ label: 'Wickets', color: '#f59e0b', points: data.bowlingTrend.map((m, i) => ({ x: i + 1, y: m.wickets })) }]}
              xTickLabel={(x) => data.bowlingTrend[x - 1]?.opponent || `Match ${x}`}
              formatY={(v) => `${v} wkts`}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Boundary Analysis</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Fours" value={data.boundaryAnalysis.fours} />
          <StatTile label="Sixes" value={data.boundaryAnalysis.sixes} />
          <StatTile label="Boundary Runs" value={data.boundaryAnalysis.boundaryRuns} />
          <StatTile label="Runs From Boundaries" value={pct(data.boundaryAnalysis.boundaryRunsPercentage)} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Dot-Ball Analysis</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Batting Dots" value={data.dotBallAnalysis.batting.dots} />
          <StatTile label="Batting Dot %" value={pct(data.dotBallAnalysis.batting.dotBallPercentage)} />
          <StatTile label="Bowling Dots" value={data.dotBallAnalysis.bowling.dots} />
          <StatTile label="Bowling Dot %" value={pct(data.dotBallAnalysis.bowling.dotBallPercentage)} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-bold text-white">Batting Consistency (recent innings)</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Mean Runs" value={num(data.consistency.meanRuns, 1)} />
          <StatTile label="Median Runs" value={num(data.consistency.medianRuns, 1)} />
          <StatTile label="30+ Scores" value={data.consistency.thirtyPlusCount} />
          <StatTile label="50+ Scores" value={data.consistency.fiftyPlusCount} />
        </div>
      </div>

      {data.dismissalBreakdown.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Dismissal Breakdown</h3>
          <div className="mt-4">
            <BarChart data={data.dismissalBreakdown.map((d) => ({ label: d.type, value: d.count }))} formatValue={(v) => v} />
          </div>
        </div>
      )}

      {data.tournamentBreakdown && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">{data.tournamentBreakdown.name} — Tournament Record</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Matches" value={data.tournamentBreakdown.matches} />
            <StatTile label="Runs" value={data.tournamentBreakdown.batting.runs} />
            <StatTile label="Average" value={num(data.tournamentBreakdown.batting.average, 2)} />
            <StatTile label="Wickets" value={data.tournamentBreakdown.bowling.wickets} />
          </div>
        </div>
      )}
    </div>
  )
}
