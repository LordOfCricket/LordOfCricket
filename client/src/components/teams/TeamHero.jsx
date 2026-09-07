import TeamBadge from './TeamBadge.jsx'

// Team identity header. Only real, stored fields:
// no fabricated "Founded 2026" — teams.created_at is the one timestamp that
// actually exists, shown as a neutral "Registered" fact rather than implying
// club history the data doesn't carry. No location (not a stored column) and
// no permanent captain (only match-level match_players.is_captain exists —
// an audited decision).
function formatRegisteredDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function TeamHero({ team, squadCount }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-6 text-center shadow-sm backdrop-blur-sm sm:p-8">
      <TeamBadge team={team} size="lg" />
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{team.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {squadCount} {squadCount === 1 ? 'Player' : 'Players'}
          {team.registeredAt ? ` · Registered ${formatRegisteredDate(team.registeredAt)}` : ''}
        </p>
      </div>
    </div>
  )
}
