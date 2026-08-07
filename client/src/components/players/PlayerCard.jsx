import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import { roleLabel } from '../../models/player.model.js'

function fmt(n) {
  return n == null ? '—' : n
}

// Role only changes which two numbers are emphasized (Part 46) — batting
// figures are never hidden for a bowler, and vice versa.
const BOWLING_PRIMARY_ROLES = new Set(['BOWLER', 'ALL_ROUNDER'])

export default function PlayerCard({ player, career }) {
  const navigate = useNavigate()
  const bowlingFirst = BOWLING_PRIMARY_ROLES.has(player.role)

  const battingStats = (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Matches</p>
        <p className="text-sm font-bold text-white">{fmt(career.matches)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Runs</p>
        <p className="text-sm font-bold text-white">{fmt(career.batting.runs)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Avg</p>
        <p className="text-sm font-bold text-white">{fmt(career.batting.average)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">SR</p>
        <p className="text-sm font-bold text-white">{fmt(career.batting.strikeRate)}</p>
      </div>
    </div>
  )

  const bowlingStats = (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Matches</p>
        <p className="text-sm font-bold text-white">{fmt(career.matches)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Wkts</p>
        <p className="text-sm font-bold text-white">{fmt(career.bowling.wickets)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Econ</p>
        <p className="text-sm font-bold text-white">{fmt(career.bowling.economy)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Best</p>
        <p className="text-sm font-bold text-white">{career.bowling.bestBowling ? `${career.bowling.bestBowling.wickets}/${career.bowling.bestBowling.runs}` : '—'}</p>
      </div>
    </div>
  )

  return (
    <button
      type="button"
      onClick={() => navigate(`/players/${player.publicPlayerId}`)}
      className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-slate-900/70"
    >
      <div className="flex items-center gap-3">
        <Avatar name={player.name} photoUrl={player.photoUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">{player.name}</p>
          <p className="text-xs font-semibold text-emerald-300">{roleLabel(player.role) || 'Role not set'}</p>
          {player.team && <p className="truncate text-xs text-slate-400">{player.team.name}</p>}
        </div>
      </div>

      {bowlingFirst ? bowlingStats : battingStats}

      <span className="inline-flex items-center justify-center rounded-full border border-white/10 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 transition-colors group-hover:bg-white/5">
        View Profile
      </span>
    </button>
  )
}
