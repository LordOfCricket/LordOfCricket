import { useEffect, useState } from 'react'
import { getFeaturedMatch } from '../../services/matches.js'
import TeamScore from './TeamScore.jsx'

export default function LiveScoreCard() {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeaturedMatch()
      .then((data) => setMatch(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-3xl border border-emerald-400/15 bg-emerald-900/30 text-emerald-100/60">
        Loading score…
      </div>
    )
  }

  if (!match) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-3xl border border-dashed border-emerald-400/20 bg-emerald-900/20 px-6 text-center text-emerald-100/60">
        No match scheduled right now
      </div>
    )
  }

  const isLive = match.status === 'live'
  const matchDate = new Date(match.match_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border border-emerald-400/15 bg-linear-to-b from-emerald-900/60 to-emerald-950/60 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-emerald-100/50">
          {matchDate}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        ) : (
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            {match.status.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TeamScore
          name={match.team_a_name}
          shortName={match.team_a_short}
          logoUrl={match.team_a_logo}
          runs={match.team_a_runs}
          wickets={match.team_a_wickets}
          overs={match.team_a_overs}
        />
        <span className="text-sm font-semibold text-emerald-100/40">VS</span>
        <TeamScore
          name={match.team_b_name}
          shortName={match.team_b_short}
          logoUrl={match.team_b_logo}
          runs={match.team_b_runs}
          wickets={match.team_b_wickets}
          overs={match.team_b_overs}
        />
      </div>

      {match.result ? (
        <p className="text-center text-sm font-medium text-emerald-300">{match.result}</p>
      ) : (
        <p className="text-center text-xs text-emerald-100/50">{match.venue}</p>
      )}
    </div>
  )
}
