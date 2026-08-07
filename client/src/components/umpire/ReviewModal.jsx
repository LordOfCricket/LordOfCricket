import { useState } from 'react'
import { REVIEW_TYPES } from '../../models/umpireMatch.model.js'

const DECISIONS = [
  { id: 'out', label: 'Out' },
  { id: 'not-out', label: 'Not Out' },
  { id: 'umpires-call', label: "Umpire's Call" },
  { id: 'inconclusive', label: 'Inconclusive' },
]

export default function ReviewModal({ open, onClose, onConfirm }) {
  const [reviewType, setReviewType] = useState(null)
  const [requestedBy, setRequestedBy] = useState(null)
  const [decision, setDecision] = useState(null)

  if (!open) return null

  const close = () => {
    setReviewType(null)
    setRequestedBy(null)
    setDecision(null)
    onClose()
  }

  const confirm = () => {
    if (!reviewType || !requestedBy || !decision) return
    onConfirm({ reviewType, requestedBy, decision })
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Review</h2>
          <button type="button" onClick={close} className="text-emerald-100/50 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Review Type</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REVIEW_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReviewType(t.id)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 ${
                  reviewType === t.id ? 'border-emerald-400/60 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Requested By</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {['batting', 'fielding', 'umpire'].map((who) => (
              <button
                key={who}
                type="button"
                onClick={() => setRequestedBy(who)}
                className={`min-h-11 rounded-lg border px-2 text-xs font-semibold capitalize transition-all ${
                  requestedBy === who ? 'border-emerald-400/50 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80'
                }`}
              >
                {who}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Decision</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DECISIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDecision(d.id)}
                className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition-all ${
                  decision === d.id ? 'border-amber-400/50 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!reviewType || !requestedBy || !decision}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold uppercase tracking-wide text-emerald-950 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record Review
        </button>
      </div>
    </div>
  )
}
