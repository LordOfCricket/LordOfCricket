import { Link } from 'react-router-dom'
import { Trophy, Users, CalendarRange } from 'lucide-react'
import { formatLabel, statusLabel, formatDateRange } from '../../models/tournament.model.js'

const STATUS_DOT = {
  DRAFT: 'bg-slate-400',
  REGISTRATION: 'bg-amber-400',
  SCHEDULED: 'bg-sky-400',
  LIVE: 'bg-rose-400 animate-pulse',
  COMPLETED: 'bg-emerald-400',
}

export default function TournamentCard({ tournament }) {
  return (
    <Link
      to={`/tournaments/${tournament.publicTournamentId}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-colors hover:border-emerald-400/40 hover:bg-slate-900/70"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[tournament.status] || 'bg-slate-400'}`} aria-hidden="true" />
          {statusLabel(tournament.status)}
        </span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{formatLabel(tournament.format)}</p>

      <div className="flex items-center gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
          {formatDateRange(tournament.startDate, tournament.endDate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {tournament.teamCount ?? 0}/{tournament.maxTeams} teams
        </span>
      </div>

      {tournament.status === 'COMPLETED' && tournament.championTeamName && (
        <div className="mt-1 inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-200">
          <Trophy className="h-4 w-4" />
          {tournament.championTeamName}
        </div>
      )}
    </Link>
  )
}
