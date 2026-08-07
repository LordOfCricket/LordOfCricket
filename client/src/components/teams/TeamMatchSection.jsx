import MatchCard from '../matches/MatchCard.jsx'

// Phase 10 Part 2 (Part 26/27/48) — reuses Phase 10 Part 1's exact MatchCard/
// DTO, never a forked team-specific match card with different result semantics.
export default function TeamMatchSection({ title, matches, emptyMessage }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {matches.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-6 text-center text-sm text-slate-300">{emptyMessage}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}
