import { getTeamPlayers } from '../../models/umpireMatch.model.js'

export default function NewBatsmanModal({ open, match, innings, onSelect }) {
  if (!open) return null

  const usedIds = new Set(
    [
      ...Object.entries(innings.batsmen).filter(([, stat]) => stat.out).map(([id]) => id),
      innings.ends.strikerEnd,
      innings.ends.nonStrikerEnd,
    ].filter(Boolean)
  )
  const available = getTeamPlayers(match, innings.battingTeamId).filter((p) => !usedIds.has(p.id))

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl">
        <h2 className="text-lg font-bold text-white">Select New Batsman</h2>
        <div className="mt-4 grid max-h-96 grid-cols-1 gap-2 overflow-y-auto">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-left text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
            >
              {p.name} <span className="ml-2 text-xs font-normal text-emerald-100/50">{p.role}</span>
            </button>
          ))}
          {available.length === 0 && <p className="text-sm text-emerald-100/40">All out — innings complete.</p>}
        </div>
      </div>
    </div>
  )
}
