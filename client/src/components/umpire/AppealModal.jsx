import { useState } from 'react'
import { APPEAL_TYPES } from '../../models/umpireMatch.model.js'

export default function AppealModal({ open, onClose, onConfirm }) {
  const [appealType, setAppealType] = useState(null)
  const [decision, setDecision] = useState(null)

  if (!open) return null

  const close = () => {
    setAppealType(null)
    setDecision(null)
    onClose()
  }

  const confirm = () => {
    if (!appealType || !decision) return
    onConfirm({ appealType, decision })
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={close}>
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Appeal</h2>
          <button type="button" onClick={close} className="text-emerald-100/50 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Appeal Type</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {APPEAL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAppealType(t.id)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 ${
                  appealType === t.id ? 'border-emerald-400/60 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Umpire's Decision</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision('out')}
              className={`min-h-12 rounded-xl text-sm font-bold uppercase ${decision === 'out' ? 'bg-rose-500 text-white' : 'bg-white/10 text-emerald-100/70'}`}
            >
              Out
            </button>
            <button
              type="button"
              onClick={() => setDecision('not-out')}
              className={`min-h-12 rounded-xl text-sm font-bold uppercase ${decision === 'not-out' ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
            >
              Not Out
            </button>
          </div>
        </div>

        {decision === 'out' && (
          <p className="mt-3 text-xs text-amber-200">If confirmed as out, record the dismissal separately with the Wicket button.</p>
        )}

        <button
          type="button"
          disabled={!appealType || !decision}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold uppercase tracking-wide text-emerald-950 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record Appeal
        </button>
      </div>
    </div>
  )
}
