import { MapPin, CalendarDays, Users } from 'lucide-react'
import { formatMatchDate, formatMatchTime } from '../../models/matchDiscovery.model.js'
import { slotSummary } from '../../models/umpireDashboard.model.js'

export default function AvailableMatchCard({ match, applying, result, onApply }) {
  const { total, filled, open } = slotSummary(match)

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="text-center">
        <p className="text-lg font-bold text-white">{match.team_a_name}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">vs</p>
        <p className="text-lg font-bold text-white">{match.team_b_name}</p>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        {match.ground_name && (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-300" />
            <span className="truncate">
              {match.ground_name}
              {match.ground_city ? `, ${match.ground_city}` : ''}
            </span>
          </p>
        )}
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-300" />
          {formatMatchDate(match.match_date)} · {formatMatchTime(match.match_date)}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Users className="h-4 w-4" />
          Umpires
        </p>
        <p className="mt-1 text-sm font-semibold text-white">
          {filled} / {total} filled
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-300">
          <span aria-hidden="true">🟢</span>
          {open} slot{open === 1 ? '' : 's'} available
        </p>
      </div>

      {result && (
        <p className={`mt-3 text-sm ${result.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`} role="status">
          {result.text}
        </p>
      )}

      <button
        type="button"
        disabled={applying}
        onClick={() => onApply(match)}
        className="mt-4 h-12 w-full rounded-2xl bg-linear-to-r from-green-700 via-green-500 to-lime-500 text-sm font-semibold text-white shadow-lg shadow-green-900/40 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {applying ? 'Applying…' : 'Apply for Slot'}
      </button>
    </div>
  )
}
