import { useState } from 'react'
import { FIELDING_EVENT_TYPES, getTeamPlayers } from '../../models/umpireMatch.model.js'

export default function FieldingEventModal({ open, onClose, match, innings, onConfirm }) {
  const [fieldingType, setFieldingType] = useState(null)
  const [fielderId, setFielderId] = useState(null)

  if (!open) return null

  const fielders = getTeamPlayers(match, innings.bowlingTeamId)

  const close = () => {
    setFieldingType(null)
    setFielderId(null)
    onClose()
  }

  const confirm = () => {
    if (!fieldingType) return
    onConfirm({ fieldingType, fielderId })
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-emerald-200">Fielding Event</h2>
          <button type="button" onClick={close} className="text-emerald-100/50 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {FIELDING_EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFieldingType(t.id)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 ${
                fieldingType === t.id ? 'border-emerald-400/60 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Fielder (optional)</p>
          <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
            {fielders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFielderId(f.id)}
                className={`min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-all ${
                  fielderId === f.id ? 'border-emerald-400/50 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!fieldingType}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold uppercase tracking-wide text-emerald-950 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record Event
        </button>
      </div>
    </div>
  )
}
