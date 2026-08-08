import { useNavigate } from 'react-router-dom'
import { statusLabel } from '../../models/matchDiscovery.model.js'
import useGlowHover from '../../hooks/useGlowHover.js'
import GlowOverlay from '../common/GlowOverlay.jsx'

// Phase 10 Part 1 — the homepage's prominent single live match (Part 27/28).
// Deterministic selection: whichever match listPublicMatches({category:'LIVE'})
// returns first (most recently started) — no manual "featured_match" flag.
// Every number here is server-computed (buildMatchCard.js); this component
// only formats display strings.

function chaseLine(chase) {
  if (!chase) return null
  const rrr = chase.requiredRunRate != null ? ` (RRR ${chase.requiredRunRate.toFixed(2)})` : ''
  return `Need ${chase.runsNeeded}${chase.ballsRemaining != null ? ` from ${chase.ballsRemaining} balls` : ''}${rrr}`
}

export default function FeaturedLiveMatch({ match }) {
  const navigate = useNavigate()
  const { enabled: glowEnabled, ref: glowRef, onPointerMove: onGlowMove, onPointerLeave: onGlowLeave } = useGlowHover()

  if (!match) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald-400/20 bg-emerald-900/20 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-emerald-100/70">No live match right now</p>
        <p className="text-xs text-emerald-100/50">Check the fixtures below for what's coming up.</p>
      </div>
    )
  }

  const innings1 = match.innings.find((i) => i.inningsNumber === 1) || null
  const innings2 = match.innings.find((i) => i.inningsNumber === 2) || null
  const battingNow = innings2 ?? innings1
  const battingTeam = battingNow?.battingTeamId === match.teamA.id ? match.teamA : battingNow?.battingTeamId === match.teamB.id ? match.teamB : null
  const chaseText = chaseLine(match.chase)

  return (
    <button
      type="button"
      onClick={() => navigate(`/matches/${match.id}/summary`)}
      ref={glowRef}
      {...(glowEnabled ? { onPointerMove: onGlowMove, onPointerLeave: onGlowLeave } : {})}
      className="relative flex h-full w-full flex-col gap-4 rounded-3xl border border-emerald-400/15 bg-linear-to-b from-emerald-900/60 to-emerald-950/60 p-6 text-left shadow-2xl shadow-black/30 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400/40"
    >
      {glowEnabled && <GlowOverlay />}
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-200">
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
        {statusLabel(match)}
      </span>

      <h3 className="text-lg font-bold text-white sm:text-xl">
        {match.teamA.name} <span className="text-emerald-100/40">vs</span> {match.teamB.name}
      </h3>

      {battingTeam && battingNow && (
        <div>
          <p className="text-sm font-medium text-emerald-100/60">{battingTeam.name} batting</p>
          <p className="text-3xl font-extrabold text-white">
            {battingNow.runs}
            <span className="text-xl font-semibold text-emerald-300">/{battingNow.wickets}</span>
            <span className="ml-2 text-base font-medium text-emerald-100/50">{battingNow.oversLabel} ov</span>
          </p>
        </div>
      )}

      {match.chase && <p className="text-sm font-semibold text-amber-200">Target {match.chase.target} · {chaseText}</p>}

      <span className="mt-auto inline-flex items-center justify-center rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-emerald-950">
        Follow Match
      </span>
    </button>
  )
}
