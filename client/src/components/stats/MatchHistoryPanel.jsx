import { useNavigate } from 'react-router-dom'

function battingLine(batting) {
  if (!batting.didBat) return 'DNB'
  return `${batting.runs} (${batting.balls})${batting.notOut ? '*' : ''}`
}

function bowlingLine(bowling) {
  if (!bowling.didBowl) return 'DNB'
  return `${bowling.wickets}/${bowling.runs}`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function resultBadge(won) {
  if (won === true) return { text: 'Won', className: 'bg-emerald-500/15 text-emerald-300' }
  if (won === false) return { text: 'Lost', className: 'bg-red-500/15 text-red-300' }
  return { text: 'Tied', className: 'bg-slate-500/15 text-slate-300' }
}

export default function MatchHistoryPanel({ matchHistory, onLoadMore }) {
  const navigate = useNavigate()

  if (matchHistory.items.length === 0) {
    return <p className="text-sm text-slate-300">No finalized match history yet.</p>
  }

  return (
    <div className="space-y-3">
      {matchHistory.items.map((perf) => {
        const badge = resultBadge(perf.won)
        return (
          <button
            type="button"
            key={perf.matchId}
            onClick={() => navigate(`/matches/${perf.matchId}/summary`)}
            className="flex w-full flex-col gap-2 rounded-2xl bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-400">{formatDate(perf.date)}</p>
              <p className="text-sm font-semibold text-white">vs {perf.opponent}</p>
              <p className="text-xs text-slate-400">{perf.result || '—'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge.className}`}>{badge.text}</span>
              <span className="text-sm font-semibold text-emerald-200">{battingLine(perf.batting)}</span>
              <span className="text-sm font-semibold text-sky-200">{bowlingLine(perf.bowling)}</span>
            </div>
          </button>
        )
      })}

      {matchHistory.items.length < matchHistory.total && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full rounded-full border border-white/10 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5"
        >
          Load more ({matchHistory.items.length} of {matchHistory.total})
        </button>
      )}
    </div>
  )
}
