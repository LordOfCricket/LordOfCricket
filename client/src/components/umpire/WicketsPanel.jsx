import { useState } from 'react'
import { getPlayer } from '../../models/umpireMatch.model.js'
import { dismissalLabel, getLastWicket } from '../../models/matchStats.model.js'

export default function WicketsPanel({ match, innings }) {
  const [expanded, setExpanded] = useState(false)
  const last = getLastWicket(innings.fallOfWickets)

  if (!last) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Fall of Wickets</p>
        <p className="mt-2 text-sm text-emerald-100/40">No wickets yet.</p>
      </div>
    )
  }

  const lastPlayer = getPlayer(match, last.playerId)
  const lastStat = innings.batsmen[last.playerId]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Last Wicket</p>
      <p className="mt-1 font-semibold text-white">{lastPlayer?.name}</p>
      <p className="text-sm text-emerald-100/60">
        {lastStat?.runs ?? 0} ({lastStat?.balls ?? 0}) • {dismissalLabel(last.dismissal.type)}
      </p>
      <p className="text-xs text-emerald-100/40">
        Score: {last.score}/{last.wicketNumber} • {last.over}.{last.ball} Overs
      </p>

      <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
        {expanded ? 'Hide' : 'Show'} Fall of Wickets
      </button>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-xs text-emerald-100/70">
          {innings.fallOfWickets.map((fow) => (
            <span key={fow.wicketNumber}>
              {fow.wicketNumber}-{fow.score}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
