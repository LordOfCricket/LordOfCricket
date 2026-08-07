import { calculateRunRate, calculateRequiredRunRate, getBallsRemaining, formatOvers } from '../../models/matchStats.model.js'

export default function LiveScoreHero({ innings, oversLimit }) {
  const runRate = calculateRunRate(innings.runs, innings.legalBalls)
  const isChasing = innings.target != null
  const ballsRemaining = getBallsRemaining(oversLimit, innings.legalBalls)
  const requiredRunRate = isChasing ? calculateRequiredRunRate(innings.target, innings.runs, ballsRemaining) : null
  const runsNeeded = isChasing ? Math.max(0, innings.target - innings.runs) : null

  return (
    <div className="rounded-3xl border border-emerald-400/20 bg-linear-to-b from-emerald-900/60 to-emerald-950/60 p-6 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/70">Score</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums sm:text-6xl">
            {innings.runs}
            <span className="text-emerald-100/40">/</span>
            {innings.wickets}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-100/60">{formatOvers(innings.legalBalls)} Overs</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Stat label="CRR" value={runRate.toFixed(2)} />
          {isChasing && <Stat label="RRR" value={requiredRunRate.toFixed(2)} accent />}
        </div>
      </div>

      {isChasing && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-black/20 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-300">Target: {innings.target}</span>
          <span className="text-emerald-100/70">
            Need {runsNeeded} from {ballsRemaining} balls
          </span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-right">
      <p className="text-[11px] uppercase tracking-wide text-emerald-100/50">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p>
    </div>
  )
}
