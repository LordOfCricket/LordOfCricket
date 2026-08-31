import { useState } from 'react'
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

function MetricToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
            value === o.key ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Career vs Recent — two comparable figure sets from the backend
// (careerVsRecent.career / .recent, both the SAME aggregateBatting/
// aggregateBowling the career stats endpoint uses). No trend verdict.
function CvrRow({ label, career, recent, fmt = (v) => (v == null ? '—' : v) }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 border-b border-white/5 py-1.5 text-sm last:border-0">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{fmt(career)}</span>
      <span className="text-right font-semibold text-emerald-200">{fmt(recent)}</span>
    </div>
  )
}

export default function PlayerAnalyticsSection({ publicPlayerId }) {
  const { data, loading, error } = useAnalytics(fetchPlayerAnalytics, publicPlayerId)
  const [batMetric, setBatMetric] = useState('runs') // 'runs' | 'strikeRate'
  const [bowlMetric, setBowlMetric] = useState('wickets') // 'wickets' | 'economy'

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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Batting Trend — Last {data.battingTrend.length} Innings</h3>
            <MetricToggle
              options={[
                { key: 'runs', label: 'Runs' },
                { key: 'strikeRate', label: 'SR' },
              ]}
              value={batMetric}
              onChange={setBatMetric}
            />
          </div>
          <div className="mt-4">
            <LineChart
              series={[
                {
                  label: batMetric === 'runs' ? 'Runs' : 'Strike Rate',
                  color: '#34d399',
                  points: data.battingTrend.map((m, i) => ({ x: i + 1, y: batMetric === 'runs' ? m.runs : m.strikeRate ?? 0 })),
                },
              ]}
              xTickLabel={(x) => data.battingTrend[x - 1]?.opponent || `Match ${x}`}
              formatY={(v) => (batMetric === 'runs' ? `${v} runs` : v.toFixed(1))}
            />
          </div>
        </div>
      )}

      {data.bowlingTrend.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Bowling Trend — Last {data.bowlingTrend.length} Innings</h3>
            <MetricToggle
              options={[
                { key: 'wickets', label: 'Wkts' },
                { key: 'economy', label: 'Econ' },
              ]}
              value={bowlMetric}
              onChange={setBowlMetric}
            />
          </div>
          <div className="mt-4">
            <LineChart
              series={[
                {
                  label: bowlMetric === 'wickets' ? 'Wickets' : 'Economy',
                  color: '#f59e0b',
                  points: data.bowlingTrend.map((m, i) => ({ x: i + 1, y: bowlMetric === 'wickets' ? m.wickets : m.economy ?? 0 })),
                },
              ]}
              xTickLabel={(x) => data.bowlingTrend[x - 1]?.opponent || `Match ${x}`}
              formatY={(v) => (bowlMetric === 'wickets' ? `${v} wkts` : v.toFixed(2))}
            />
          </div>
        </div>
      )}

      {data.careerVsRecent && data.careerVsRecent.recent.matches > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-bold text-white">Career vs Recent</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span />
            <span className="text-right">Career ({data.careerVsRecent.career.matches})</span>
            <span className="text-right">Last {data.careerVsRecent.recent.matches}</span>
          </div>
          <CvrRow label="Runs" career={data.careerVsRecent.career.batting.runs} recent={data.careerVsRecent.recent.batting.runs} />
          <CvrRow
            label="Bat Avg"
            career={data.careerVsRecent.career.batting.average}
            recent={data.careerVsRecent.recent.batting.average}
            fmt={(v) => num(v, 2)}
          />
          <CvrRow
            label="Strike Rate"
            career={data.careerVsRecent.career.batting.strikeRate}
            recent={data.careerVsRecent.recent.batting.strikeRate}
            fmt={(v) => num(v, 2)}
          />
          <CvrRow label="50s / 100s" career={`${data.careerVsRecent.career.batting.fifties} / ${data.careerVsRecent.career.batting.hundreds}`} recent={`${data.careerVsRecent.recent.batting.fifties} / ${data.careerVsRecent.recent.batting.hundreds}`} />
          <CvrRow label="Wickets" career={data.careerVsRecent.career.bowling.wickets} recent={data.careerVsRecent.recent.bowling.wickets} />
          <CvrRow
            label="Economy"
            career={data.careerVsRecent.career.bowling.economy}
            recent={data.careerVsRecent.recent.bowling.economy}
            fmt={(v) => num(v, 2)}
          />
          <CvrRow
            label="Bowl Avg"
            career={data.careerVsRecent.career.bowling.average}
            recent={data.careerVsRecent.recent.bowling.average}
            fmt={(v) => num(v, 2)}
          />
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
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Mean Runs" value={num(data.consistency.meanRuns, 1)} />
          <StatTile label="Median Runs" value={num(data.consistency.medianRuns, 1)} />
          <StatTile label="30+ Scores" value={data.consistency.thirtyPlusCount} />
          <StatTile label="50+ Scores" value={data.consistency.fiftyPlusCount} />
          <StatTile label="Not Outs" value={data.consistency.notOuts} />
          <StatTile label="Dismissals" value={data.consistency.dismissals} />
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
