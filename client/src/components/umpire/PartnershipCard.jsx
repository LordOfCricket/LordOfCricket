import { getPlayer } from '../../models/umpireMatch.model.js'

export default function PartnershipCard({ match, innings }) {
  const { runs, balls, batsmen } = innings.partnership
  if (batsmen.length === 0) return null

  const players = batsmen.map((id) => getPlayer(match, id)).filter(Boolean)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Partnership</p>
      <p className="mt-1 text-2xl font-bold text-white">
        {runs} <span className="text-sm font-normal text-emerald-100/50">runs ({balls} balls)</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-100/60">
        {players.map((p) => (
          <span key={p.id}>
            {p.name}: {innings.batsmen[p.id]?.runs ?? 0}
          </span>
        ))}
      </div>
    </div>
  )
}
