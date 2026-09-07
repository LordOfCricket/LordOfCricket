import { useNavigate } from 'react-router-dom'
import { statusLabel, formatMatchDate, formatMatchTime, formatOversFormat } from '../../models/matchDiscovery.model.js'
import TeamBadge from '../teams/TeamBadge.jsx'
import useGlowHover from '../../hooks/useGlowHover.js'
import GlowOverlay from '../common/GlowOverlay.jsx'

// One adaptive card for all three categories,
// never three unrelated implementations. Every number shown is already
// computed server-side by buildMatchCard.js; this component only formats
// display strings.

const STATUS_BADGE_CLASS = {
  upcoming: 'bg-sky-500/15 text-sky-200',
  live: 'bg-rose-500/15 text-rose-200',
  completed: 'bg-amber-500/15 text-amber-200',
  finalized: 'bg-emerald-500/15 text-emerald-200',
}

function StatusBadge({ match }) {
  const label = statusLabel(match)
  const isLive = match.status === 'live' && !match.isInningsBreak
  const className = match.isInningsBreak ? STATUS_BADGE_CLASS.upcoming : STATUS_BADGE_CLASS[match.status] || 'bg-white/10 text-slate-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${className}`}>
      {isLive && <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />}
      {label}
    </span>
  )
}

function TeamRow({ team, inningsEntry }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamBadge team={team} size="sm" />
        <p className="truncate text-sm font-semibold text-white">{team.name}</p>
      </div>
      {inningsEntry ? (
        <p className="shrink-0 text-sm font-bold text-white">
          {inningsEntry.runs}
          <span className="text-slate-400">/{inningsEntry.wickets}</span>
          <span className="ml-1 text-xs font-medium text-slate-400">({inningsEntry.oversLabel})</span>
        </p>
      ) : (
        <p className="shrink-0 text-xs text-slate-400">Yet to bat</p>
      )}
    </div>
  )
}

function chaseLine(chase) {
  if (!chase) return null
  const rrr = chase.requiredRunRate != null ? ` · RRR ${chase.requiredRunRate.toFixed(2)}` : ''
  return `Need ${chase.runsNeeded}${chase.ballsRemaining != null ? ` from ${chase.ballsRemaining} balls` : ''}${rrr}`
}

export default function MatchCard({ match }) {
  const navigate = useNavigate()
  const { enabled: glowEnabled, ref: glowRef, onPointerMove: onGlowMove, onPointerLeave: onGlowLeave } = useGlowHover()
  const innings1 = match.innings.find((i) => i.inningsNumber === 1) || null
  const innings2 = match.innings.find((i) => i.inningsNumber === 2) || null
  const chaseText = chaseLine(match.chase)

  return (
    <button
      type="button"
      onClick={() => navigate(`/matches/${match.id}/summary`)}
      ref={glowRef}
      {...(glowEnabled ? { onPointerMove: onGlowMove, onPointerLeave: onGlowLeave } : {})}
      className="relative flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-slate-900/80 sm:p-5"
    >
      {glowEnabled && <GlowOverlay />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge match={match} />
        <p className="text-xs font-medium text-slate-400">
          {formatMatchDate(match.matchDate)}
          {match.status === 'upcoming' ? ` · ${formatMatchTime(match.matchDate)}` : ''}
          {match.venue ? ` · ${match.venue}` : ''}
          {match.status === 'upcoming' && formatOversFormat(match.format.oversPerInnings) ? ` · ${formatOversFormat(match.format.oversPerInnings)}` : ''}
        </p>
      </div>

      <div className="space-y-2">
        <TeamRow team={match.teamA} inningsEntry={match.teamA.id === innings1?.battingTeamId ? innings1 : match.teamA.id === innings2?.battingTeamId ? innings2 : null} />
        <TeamRow team={match.teamB} inningsEntry={match.teamB.id === innings1?.battingTeamId ? innings1 : match.teamB.id === innings2?.battingTeamId ? innings2 : null} />
      </div>

      {chaseText && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">{chaseText}</p>}
      {match.result && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">{match.result.text}</p>}

      <span className="inline-flex items-center justify-center rounded-full border border-white/10 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 transition-colors">
        View Match
      </span>
    </button>
  )
}
