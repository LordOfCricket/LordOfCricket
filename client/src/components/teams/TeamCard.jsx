import { useNavigate } from 'react-router-dom'
import TeamBadge from './TeamBadge.jsx'

// Phase 10 Part 2 — public team directory card (Part 10). Every number is
// already computed server-side by buildTeamCard.js.
export default function TeamCard({ team }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/teams/${team.id}`)}
      className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-slate-900/80"
    >
      <TeamBadge team={team} size="lg" />
      <p className="text-base font-bold text-white">{team.name}</p>
      <p className="text-xs text-slate-400">
        {team.squadCount} {team.squadCount === 1 ? 'Player' : 'Players'}
      </p>

      <div className="grid w-full grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-lg font-bold text-white">{team.matchCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Matches</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <p className="text-lg font-bold text-emerald-300">{team.wins}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Wins</p>
        </div>
      </div>

      <span className="inline-flex w-full items-center justify-center rounded-full border border-white/10 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200">
        View Team
      </span>
    </button>
  )
}
