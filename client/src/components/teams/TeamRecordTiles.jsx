// Phase 10 Part 2 — official record tiles (Part 17/65). Finalized-matches-only,
// computed server-side by domain/team/teamRecord.js — this component only formats.
function Tile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-4 text-center">
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

export default function TeamRecordTiles({ record }) {
  if (record.matches === 0) {
    return <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-slate-300">No official results yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Matches" value={record.matches} />
      <Tile label="Wins" value={record.wins} />
      <Tile label="Losses" value={record.losses} />
      <Tile label="Win %" value={record.winPercentage != null ? `${record.winPercentage.toFixed(1)}%` : '—'} />
      {record.ties > 0 && <Tile label="Ties" value={record.ties} />}
      {record.noResults > 0 && <Tile label="No Result" value={record.noResults} />}
    </div>
  )
}
