import { useState } from 'react'
import WagonWheel from '../wagon-wheel/WagonWheel.jsx'

const NOOP = () => {}

export default function WagonWheelSection({ innings }) {
  const batters = [...new Map(innings.wagonWheel.map((s) => [s.player.publicPlayerId, s.player])).values()]
  const [selected, setSelected] = useState('')

  if (innings.wagonWheel.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-5 text-center shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Wagon Wheel</p>
        <p className="mt-3 text-sm text-slate-400">No wagon wheel data recorded for this innings.</p>
      </div>
    )
  }

  const shots = selected ? innings.wagonWheel.filter((s) => s.player.publicPlayerId === selected) : innings.wagonWheel
  const summary = shots.reduce(
    (acc, s) => ({ runs: acc.runs + s.runs, fours: acc.fours + (s.runs === 4 ? 1 : 0), sixes: acc.sixes + (s.runs === 6 ? 1 : 0) }),
    { runs: 0, fours: 0, sixes: 0 }
  )

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Wagon Wheel</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-emerald-400/50 focus:outline-none"
        >
          <option value="" className="bg-slate-900">All Batters</option>
          {batters.map((b) => (
            <option key={b.publicPlayerId} value={b.publicPlayerId} className="bg-slate-900">
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mx-auto mt-3 aspect-square w-full max-w-md">
        <WagonWheel actions={shots} pendingShot={null} onSelectShot={NOOP} />
      </div>

      <p className="mt-3 text-center text-xs font-semibold text-slate-300">
        Runs: {summary.runs} · 4s: {summary.fours} · 6s: {summary.sixes}
      </p>
    </div>
  )
}
