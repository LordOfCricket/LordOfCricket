import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { STAGE_LABELS } from '../../models/tournament.model.js'

const STAGE_ORDER = ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL']

function TeamLine({ name, teamId, isWinner }) {
  if (!teamId) {
    return <p className="truncate text-xs text-slate-500">TBD</p>
  }
  return (
    <Link to={`/teams/${teamId}`} className={`truncate text-sm hover:text-emerald-300 ${isWinner ? 'font-bold text-white' : 'text-slate-300'}`}>
      {name}
      {isWinner && <Trophy className="ml-1 inline h-3 w-3 text-amber-300" aria-label="Winner" />}
    </Link>
  )
}

/** A simple, correctness-first bracket — horizontal scroll inside its own
 * container (never the page) rather than fancy connector-line SVG. */
export default function BracketView({ fixtures }) {
  const stages = STAGE_ORDER.filter((s) => fixtures.some((f) => f.stage === s))
  if (stages.length === 0) {
    return <p className="text-sm text-slate-400">The knockout bracket will appear once the group/qualifying stage is complete.</p>
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-6 pb-2">
        {stages.map((stage) => {
          const stageFixtures = fixtures.filter((f) => f.stage === stage).sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0))
          return (
            <div key={stage} className="flex w-56 shrink-0 flex-col justify-center gap-6">
              <h3 className="text-center text-xs font-bold uppercase tracking-wide text-emerald-300">{STAGE_LABELS[stage] || stage}</h3>
              {stageFixtures.map((f) => {
                const winnerTeamId = f.winnerTeamId ?? f.manualResultWinnerTeamId
                return (
                  <div key={f.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <TeamLine name={f.teamA.name} teamId={f.teamA.id} isWinner={winnerTeamId === f.teamA.id} />
                    <div className="my-1 h-px bg-white/10" />
                    <TeamLine name={f.teamB.name} teamId={f.teamB.id} isWinner={winnerTeamId === f.teamB.id} />
                    {f.awaitingResolution && <p className="mt-2 text-[11px] font-semibold text-amber-300">Tie-break required</p>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
