export default function MatchHeader({ match, innings, inningsNumber }) {
  const [teamA, teamB] = Object.values(match.teams)
  const battingTeam = match.teams[innings.battingTeamId]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-bold tracking-tight sm:text-lg">
          {teamA.shortName} <span className="text-emerald-100/40">vs</span> {teamB.shortName}
        </h1>
        <p className="mt-0.5 text-xs text-emerald-100/50">
          {match.format.label} • {inningsNumber === 1 ? '1st' : '2nd'} Innings • {battingTeam.name} Batting
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-emerald-100/50">
        <span className="hidden sm:inline">{match.venue}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
        </span>
      </div>
    </div>
  )
}
