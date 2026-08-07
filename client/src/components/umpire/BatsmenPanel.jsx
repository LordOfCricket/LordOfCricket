import { getPlayer } from '../../models/umpireMatch.model.js'

const EMPTY_STAT = { runs: 0, balls: 0, fours: 0, sixes: 0 }

function BatsmanRow({ player, stat, isStriker }) {
  const strikeRate = stat.balls ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'

  return (
    <div className={`rounded-2xl border px-4 py-3 ${isStriker ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">
          {player?.name || 'Batsman'} {isStriker && <span className="text-emerald-300">*</span>}
        </p>
        <p className="font-bold tabular-nums text-white">
          {stat.runs} <span className="text-sm font-normal text-emerald-100/50">({stat.balls})</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-emerald-100/50">
        4s: {stat.fours} • 6s: {stat.sixes} • SR: {strikeRate}
      </p>
    </div>
  )
}

export default function BatsmenPanel({ match, innings, onSwapStrike }) {
  const strikerId = innings.ends.strikerEnd
  const nonStrikerId = innings.ends.nonStrikerEnd

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Batsmen</p>
        <button
          type="button"
          onClick={onSwapStrike}
          disabled={!strikerId || !nonStrikerId}
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-emerald-100/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Swap Strike
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {strikerId && <BatsmanRow player={getPlayer(match, strikerId)} stat={innings.batsmen[strikerId] || EMPTY_STAT} isStriker />}
        {nonStrikerId && <BatsmanRow player={getPlayer(match, nonStrikerId)} stat={innings.batsmen[nonStrikerId] || EMPTY_STAT} isStriker={false} />}
        {!strikerId && !nonStrikerId && <p className="text-sm text-emerald-100/40">Awaiting openers.</p>}
      </div>
    </div>
  )
}
