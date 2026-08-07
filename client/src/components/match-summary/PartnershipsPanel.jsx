export default function PartnershipsPanel({ innings }) {
  if (innings.partnerships.length === 0) return null

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Partnerships</p>
      <div className="mt-3 space-y-2">
        {innings.partnerships.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span className="text-slate-200">
              {p.batsmen.map((b) => b.name).join(' & ')}
              {p.unbeaten && <span className="ml-1 text-xs text-emerald-300">(unbeaten)</span>}
            </span>
            <span className="font-semibold text-white">
              {p.runs} <span className="text-xs text-slate-400">({p.balls} balls)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
