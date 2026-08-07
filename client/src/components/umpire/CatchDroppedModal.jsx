import { useState } from 'react'
import { CATCH_CHANCE_LEVELS, getTeamPlayers } from '../../models/umpireMatch.model.js'

export default function CatchDroppedModal({ open, onClose, match, innings, pendingShot, onConfirm }) {
  const [fielderId, setFielderId] = useState(null)
  const [chance, setChance] = useState(null)

  if (!open) return null

  const fielders = getTeamPlayers(match, innings.bowlingTeamId)

  const close = () => {
    setFielderId(null)
    setChance(null)
    onClose()
  }

  const confirm = () => {
    if (!fielderId) return
    onConfirm({ fielderId, chance, shot: pendingShot || null })
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-amber-300">Catch Dropped</h2>
          <button type="button" onClick={close} className="text-emerald-100/50 hover:text-white">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-emerald-100/50">Not a wicket — recorded as a fielding chance for later stats and commentary.</p>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Dropped By</p>
          <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
            {fielders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFielderId(f.id)}
                className={`min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-all ${
                  fielderId === f.id ? 'border-amber-400/50 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Chance Difficulty (optional)</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CATCH_CHANCE_LEVELS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChance((prev) => (prev === c.id ? null : c.id))}
                className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition-all ${
                  chance === c.id ? 'border-amber-400/50 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {pendingShot && <p className="mt-3 text-xs text-emerald-100/50">Wagon wheel location will be attached: {pendingShot.region}.</p>}

        <button
          type="button"
          disabled={!fielderId}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold uppercase tracking-wide text-amber-950 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record Dropped Catch
        </button>
      </div>
    </div>
  )
}
