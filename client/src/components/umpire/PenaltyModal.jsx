import { useState } from 'react'

export default function PenaltyModal({ open, onClose, onConfirm }) {
  const [awardedTo, setAwardedTo] = useState(null)

  if (!open) return null

  const close = () => {
    setAwardedTo(null)
    onClose()
  }

  const confirm = () => {
    if (!awardedTo) return
    onConfirm(5, awardedTo)
    close()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-emerald-950 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">Penalty Runs</h2>

        {!awardedTo ? (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setAwardedTo('batting')}
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              +5 Batting Team
            </button>
            <button
              type="button"
              onClick={() => setAwardedTo('fielding')}
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              +5 Fielding Team
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-emerald-100/70">
              Award 5 penalty runs to the <span className="font-semibold text-white">{awardedTo}</span> team?
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setAwardedTo(null)} className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold text-white">
                Back
              </button>
              <button type="button" onClick={confirm} className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white">
                Confirm +5
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
