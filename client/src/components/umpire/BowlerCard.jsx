import { getPlayer, getTeamPlayers } from '../../models/umpireMatch.model.js'
import { calculateRunRate, formatOvers } from '../../models/matchStats.model.js'

export default function BowlerCard({ match, innings, onSelectBowler }) {
  if (innings.pendingBowlerSelection) {
    const fielders = getTeamPlayers(match, innings.bowlingTeamId)

    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Select Next Bowler</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {fielders.map((p) => {
            const isPrevious = p.id === innings.previousOverBowlerId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectBowler(p.id)}
                className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-95"
              >
                {p.name}
                {isPrevious && <span className="block text-[10px] font-normal text-amber-300">Bowled last over</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const bowler = getPlayer(match, innings.bowlerId)
  const stat = innings.bowlerId ? innings.bowlers[innings.bowlerId] : null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Current Bowler</p>
      {bowler && stat ? (
        <>
          <p className="mt-2 font-semibold text-white">{bowler.name}</p>
          <p className="mt-1 text-sm text-emerald-100/70">
            {formatOvers(stat.legalBalls)} Overs • {stat.runs} Runs • {stat.wickets} Wickets • Econ {calculateRunRate(stat.runs, stat.legalBalls).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-emerald-100/40">
            Dots: {stat.dots} • Wides: {stat.wides} • No Balls: {stat.noBalls}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-emerald-100/40">No bowler selected.</p>
      )}
    </div>
  )
}
