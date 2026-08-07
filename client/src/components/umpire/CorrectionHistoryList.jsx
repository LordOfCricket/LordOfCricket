function summarizeChange(before, after) {
  const parts = []
  if ('runsBat' in after && before.runsBat !== after.runsBat) parts.push(`Runs ${before.runsBat} → ${after.runsBat}`)
  if ('wicket' in after) {
    const wasOut = Boolean(before.wicket)
    const isOut = Boolean(after.wicket)
    if (!wasOut && isOut) parts.push('Wicket added')
    else if (wasOut && !isOut) parts.push('Wicket removed')
    else if (wasOut && isOut && before.wicket.type !== after.wicket.type) parts.push(`Wicket ${before.wicket.type} → ${after.wicket.type}`)
  }
  if ('illegal' in after && (before.illegal?.type || null) !== (after.illegal?.type || null)) {
    parts.push(`${before.illegal?.type || 'Normal'} → ${after.illegal?.type || 'Normal'}`)
  }
  if ('extra' in after && (before.extra?.type || null) !== (after.extra?.type || null)) {
    parts.push(`${before.extra?.type || 'Normal'} → ${after.extra?.type || 'Normal'}`)
  }
  if (after.swapStrikerNonStriker) parts.push('Striker corrected')
  if ('bowlerId' in after) parts.push('Bowler corrected')
  return parts.length ? parts.join(', ') : 'Updated'
}

export default function CorrectionHistoryList({ corrections, canUndoCorrection, onUndoCorrection }) {
  const recent = [...corrections].reverse()

  return (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Correction History</p>
        <button
          type="button"
          disabled={!canUndoCorrection}
          onClick={onUndoCorrection}
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-emerald-100/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo Last Correction
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-emerald-100/40">No corrections yet.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
          {recent.map((c) => (
            <li key={c.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-emerald-100/80">
              <span className="text-emerald-100/50">{new Date(c.correctedAt).toLocaleTimeString()}</span> — {summarizeChange(c.before, c.after)}
              {c.reason && <span className="text-emerald-100/50"> ({c.reason})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
