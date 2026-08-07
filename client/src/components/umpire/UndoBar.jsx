import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { describeDeliveryLabel } from '../../models/matchCommentary.model.js'

export default function UndoBar({ canUndo, lastDelivery, match, onUndo }) {
  const [confirming, setConfirming] = useState(false)

  if (!canUndo) {
    return (
      <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-emerald-100/40">
        <RotateCcw className="h-4 w-4" /> Undo Last Ball
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
        <p className="text-xs text-rose-200">Undo: {lastDelivery ? describeDeliveryLabel(lastDelivery, match) : 'last action'}</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onUndo()
              setConfirming(false)
            }}
            className="flex-1 rounded-lg bg-rose-500 py-2 text-xs font-semibold text-white"
          >
            Confirm Undo
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 py-3 text-sm font-bold uppercase tracking-wide text-rose-200 transition-all active:scale-95"
    >
      <RotateCcw className="h-4 w-4" /> Undo Last Ball
    </button>
  )
}
