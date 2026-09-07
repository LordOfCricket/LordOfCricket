import { Link } from 'react-router-dom'
import { formatMatchResultLine } from '../../models/matchDiscovery.model.js'

const STATUS_BADGE = {
  upcoming: { text: 'Upcoming', className: 'bg-sky-500/15 text-sky-200' },
  live: { text: 'Live', className: 'bg-rose-500/15 text-rose-200 animate-pulse' },
  completed: { text: 'Awaiting Finalization', className: 'bg-amber-500/15 text-amber-200' },
  finalized: { text: 'Official Result', className: 'bg-emerald-500/15 text-emerald-200' },
}

function statusBadge(match) {
  if (match.isInningsBreak) return { text: 'Innings Break', className: 'bg-sky-500/15 text-sky-200' }
  return STATUS_BADGE[match.status] || { text: match.status, className: 'bg-white/10 text-slate-200' }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MatchHero({ summary, liveScore = null }) {
  const { match, teams, innings, result } = summary
  const badge = statusBadge(match)

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400">{formatDate(match.matchDate)}{match.venue ? ` · ${match.venue}` : ''}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.className}`}>{badge.text}</span>
      </div>

      <h1 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
        <Link to={`/teams/${teams.teamA.id}`} className="hover:text-emerald-300 hover:underline">
          {teams.teamA.name}
        </Link>{' '}
        <span className="text-slate-400">vs</span>{' '}
        <Link to={`/teams/${teams.teamB.id}`} className="hover:text-emerald-300 hover:underline">
          {teams.teamB.name}
        </Link>
      </h1>

      {innings.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[teams.teamA, teams.teamB].map((team) => {
            const teamInnings = innings.filter((i) => i.battingTeamId === team.id)
            const latest = teamInnings[teamInnings.length - 1]
            if (!latest) {
              return (
                <div key={team.id} className="rounded-2xl bg-white/5 px-4 py-3">
                  <Link to={`/teams/${team.id}`} className="text-sm font-semibold text-white hover:text-emerald-300 hover:underline">
                    {team.name}
                  </Link>
                  <p className="text-xs text-slate-400">Yet to bat</p>
                </div>
              )
            }
            // If the live poller is tracking THIS exact
            // innings, its numbers supersede the page-load snapshot — one
            // authoritative score, never two drifting apart on screen.
            const score = liveScore && liveScore.inningsId === latest.inningsId ? liveScore : latest.score
            const allOut = score.wickets >= 9 && latest.score.endReason === 'ALL_OUT'
            return (
              <div key={team.id} className="rounded-2xl bg-white/5 px-4 py-3">
                <Link to={`/teams/${team.id}`} className="text-sm font-semibold text-white hover:text-emerald-300 hover:underline">
                  {team.name}
                </Link>
                <p className="text-3xl font-extrabold text-white">
                  {score.runs}
                  {!allOut && <span className="text-lg font-semibold text-slate-300">/{score.wickets}</span>}
                </p>
                <p className="text-xs text-slate-400">{score.oversLabel} overs</p>
              </div>
            )
          })}
        </div>
      )}

      {result && (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-200">
          {formatMatchResultLine(result, teams.teamA, teams.teamB)}
        </p>
      )}
    </div>
  )
}
