import { getCurrentOverDeliveries } from '../../models/matchStats.model.js'

function ballLabel(d) {
  if (d.isDeadBall) return 'DB'
  if (d.wicket) return 'W'
  if (d.illegal?.type === 'wide') return d.illegal.runs > 1 ? `Wd+${d.illegal.runs - 1}` : 'Wd'
  if (d.illegal?.type === 'no-ball') return d.runsBat ? `Nb+${d.runsBat}` : 'Nb'
  if (d.extra?.type === 'bye') return `${d.extra.runs}B`
  if (d.extra?.type === 'leg-bye') return `${d.extra.runs}Lb`
  if (d.totalRuns === 0) return '•'
  return String(d.totalRuns)
}

function ballClass(d) {
  if (d.wicket) return 'bg-rose-500 text-white'
  if (d.runsBat === 6) return 'bg-fuchsia-400 text-fuchsia-950'
  if (d.runsBat === 4) return 'bg-amber-400 text-amber-950'
  if (d.illegal || d.extra) return 'bg-amber-400/20 text-amber-200'
  if (d.totalRuns === 0) return 'bg-white/10 text-emerald-100/60'
  return 'bg-emerald-500/20 text-emerald-100'
}

export default function CurrentOverStrip({ innings, bowlerName }) {
  const deliveries = getCurrentOverDeliveries(innings.deliveries, innings.overNumber)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Current Over</p>
        {bowlerName && <p className="text-xs text-emerald-100/50">{bowlerName}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {deliveries.length === 0 && <p className="text-sm text-emerald-100/40">No balls bowled yet.</p>}
        {deliveries.map((d) => (
          <span key={d.id} className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${ballClass(d)}`}>
            {ballLabel(d)}
          </span>
        ))}
      </div>
    </div>
  )
}
