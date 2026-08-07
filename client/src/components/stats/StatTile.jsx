export default function StatTile({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${emphasis ? 'ring-1 ring-emerald-400/30' : ''}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${emphasis ? 'text-emerald-300' : 'text-white'}`}>{value ?? '—'}</p>
    </div>
  )
}
