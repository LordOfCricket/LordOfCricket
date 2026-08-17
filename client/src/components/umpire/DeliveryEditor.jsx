import { useMemo, useState } from 'react'
import { DISMISSAL_TYPES, getPlayer, getTeamPlayers } from '../../models/umpireMatch.model.js'

const RESULT_TYPES = [
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Wide' },
  { id: 'no-ball', label: 'No Ball' },
  { id: 'bye', label: 'Bye' },
  { id: 'leg-bye', label: 'Leg Bye' },
  { id: 'wicket', label: 'Wicket' },
  { id: 'dead-ball', label: 'Dead Ball' },
]

const REASONS = ['Scoring Error', 'Wrong Runs', 'Wrong Batsman', 'Wrong Bowler', 'Wrong Extra', 'Wrong Wicket', 'Other']

function getResultType(d) {
  if (d.isDeadBall) return 'dead-ball'
  if (d.wicket) return 'wicket'
  if (d.illegal?.type === 'wide') return 'wide'
  if (d.illegal?.type === 'no-ball') return 'no-ball'
  if (d.extra?.type === 'bye') return 'bye'
  if (d.extra?.type === 'leg-bye') return 'leg-bye'
  return 'normal'
}

function buildPatch({ resultType, runs, extraRuns, wicket, swapStriker }) {
  const base = { runsBat: 0, illegal: null, extra: null, wicket: null, isDeadBall: false, swapStrikerNonStriker: Boolean(swapStriker) }
  switch (resultType) {
    case 'wide':
      return { ...base, illegal: { type: 'wide', runs: 1 + extraRuns } }
    case 'no-ball':
      return { ...base, runsBat: runs, illegal: { type: 'no-ball', runs: 1 } }
    case 'bye':
      return { ...base, extra: { type: 'bye', runs: extraRuns } }
    case 'leg-bye':
      return { ...base, extra: { type: 'leg-bye', runs: extraRuns } }
    case 'dead-ball':
      return { ...base, isDeadBall: true }
    case 'wicket':
      return { ...base, runsBat: wicket?.type === 'run-out' ? wicket.runsCompleted || 0 : 0, wicket }
    default:
      return { ...base, runsBat: runs }
  }
}

export default function DeliveryEditor({ match, innings, delivery, getPreview, onApply, onCorrectBowler, onCancel }) {
  const [resultType, setResultType] = useState(getResultType(delivery))
  const [runs, setRuns] = useState(delivery.runsBat)
  const [extraRuns, setExtraRuns] = useState(delivery.illegal?.runs ? delivery.illegal.runs - 1 : delivery.extra?.runs || 1)
  const [wicketType, setWicketType] = useState(delivery.wicket?.type || null)
  const [fielderId, setFielderId] = useState(delivery.wicket?.fielderId || null)
  const [batsmanOutId, setBatsmanOutId] = useState(delivery.wicket?.batsmanOutId || delivery.strikerId)
  const [runsCompleted, setRunsCompleted] = useState(delivery.wicket?.runsCompleted || 0)
  const [swapStriker, setSwapStriker] = useState(false)
  const [reason, setReason] = useState('')
  const [showBowlerPicker, setShowBowlerPicker] = useState(false)

  const striker = getPlayer(match, delivery.strikerId)
  const nonStriker = getPlayer(match, delivery.nonStrikerId)
  const bowler = getPlayer(match, delivery.bowlerId)
  const fielders = getTeamPlayers(match, innings.bowlingTeamId)
  const allowedDismissals = delivery.isFreeHit ? ['run-out'] : DISMISSAL_TYPES.map((d) => d.id)

  const wicket =
    resultType === 'wicket' && wicketType
      ? { type: wicketType, fielderId, batsmanOutId: wicketType === 'run-out' ? batsmanOutId : null, direct: false, runsCompleted: wicketType === 'run-out' ? runsCompleted : 0 }
      : null

  const patch = useMemo(
    () => buildPatch({ resultType, runs, extraRuns, wicket, swapStriker }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultType, runs, extraRuns, wicketType, fielderId, batsmanOutId, runsCompleted, swapStriker]
  )
  const preview = useMemo(() => getPreview(delivery.id, patch), [getPreview, delivery.id, patch])

  const canApply = resultType !== 'wicket' || (wicketType && (wicketType !== 'run-out' || batsmanOutId))

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">
            Over {delivery.over - 1}.{delivery.ball - 1}
          </p>
          <p className="mt-1 text-sm text-white">
            Striker: <span className="font-semibold">{striker?.name}</span> · Non-Striker: <span className="font-semibold">{nonStriker?.name}</span>
          </p>
          <p className="text-sm text-emerald-100/70">Bowler: {bowler?.name}</p>
          {delivery.isFreeHit && <p className="mt-1 text-xs font-semibold text-amber-300">🔥 This delivery was a Free Hit</p>}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Result</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {RESULT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setResultType(t.id)}
                className={`min-h-10 rounded-lg border text-xs font-semibold transition-all ${
                  resultType === t.id ? 'border-emerald-400/60 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {(resultType === 'normal' || resultType === 'no-ball') && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">{resultType === 'no-ball' ? 'Bat Runs' : 'Runs'}</p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRuns(n)}
                  className={`min-h-10 rounded-lg text-sm font-bold ${runs === n ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {(resultType === 'wide' || resultType === 'bye' || resultType === 'leg-bye') && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">{resultType === 'wide' ? 'Additional Runs' : 'Runs'}</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {(resultType === 'wide' ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setExtraRuns(n)}
                  className={`min-h-10 rounded-lg text-sm font-bold ${extraRuns === n ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-emerald-100/70'}`}
                >
                  {resultType === 'wide' ? `+${n}` : n}
                </button>
              ))}
            </div>
          </div>
        )}

        {resultType === 'wicket' && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Dismissal Type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {DISMISSAL_TYPES.filter((d) => allowedDismissals.includes(d.id)).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setWicketType(d.id)}
                    className={`min-h-10 rounded-lg border px-2 text-xs font-semibold ${
                      wicketType === d.id ? 'border-rose-400/60 bg-rose-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {wicketType === 'caught' && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Caught By</p>
                <div className="mt-2 grid max-h-32 grid-cols-2 gap-2 overflow-y-auto">
                  {fielders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFielderId(f.id)}
                      className={`min-h-10 rounded-lg border px-2 text-left text-xs font-medium ${
                        fielderId === f.id ? 'border-emerald-400/50 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wicketType === 'run-out' && (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Who Was Dismissed?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[delivery.strikerId, delivery.nonStrikerId].filter(Boolean).map((id) => {
                      const player = getPlayer(match, id)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setBatsmanOutId(id)}
                          className={`min-h-10 rounded-lg border px-2 text-xs font-medium ${
                            batsmanOutId === id ? 'border-rose-400/50 bg-rose-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80'
                          }`}
                        >
                          {player?.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Runs Completed</p>
                  <div className="mt-2 flex gap-2">
                    {[0, 1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRunsCompleted(n)}
                        className={`h-10 w-10 rounded-lg text-sm font-bold ${runsCompleted === n ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm text-emerald-100/80">
          <input type="checkbox" checked={swapStriker} onChange={(e) => setSwapStriker(e.target.checked)} className="h-4 w-4" />
          This ball should have been faced by {nonStriker?.name || 'the non-striker'} instead
        </label>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <button type="button" onClick={() => setShowBowlerPicker((v) => !v)} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">
            Correct Bowler for Over {delivery.over}
          </button>
          {showBowlerPicker && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {fielders
                .filter((f) => f.id !== delivery.bowlerId)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onCorrectBowler(delivery.over, f.id)
                      setShowBowlerPicker(false)
                    }}
                    className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-left text-xs font-medium text-emerald-100/80 hover:bg-white/10"
                  >
                    {f.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {preview && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Impact Preview</p>
            <div className="mt-2 space-y-1 text-sm text-emerald-50/90">
              <p>
                Score: {preview.before.runs}/{preview.before.wickets} → {preview.after.runs}/{preview.after.wickets}
              </p>
              <p>
                Current Striker: {getPlayer(match, preview.before.ends.strikerEnd)?.name || '—'} → {getPlayer(match, preview.after.ends.strikerEnd)?.name || '—'}
              </p>
              <p>Affected Deliveries: {preview.affectedDeliveryCount}</p>
              {preview.dismissedPlayerChanges.length > 0 && (
                <p className="text-amber-200">
                  Also changes who was given out on {preview.dismissedPlayerChanges.map((c) => `${c.over - 1}.${c.ball - 1}`).join(', ')}.
                </p>
              )}
              {preview.conflictDelta > 0 && (
                <p className="font-semibold text-rose-300">
                  ⚠ LINEUP CONFLICT — this correction leaves {preview.conflictDelta} substitution{preview.conflictDelta === 1 ? '' : 's'} pointing at a batsman who
                  wasn't actually out. Resolve the related event in Match Timeline before relying on this replay.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Reason (optional)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason((prev) => (prev === r ? '' : r))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  reason === r ? 'border-emerald-400/50 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/70'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/10 p-4">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white">
          Cancel
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(delivery.id, patch, reason)}
          className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold uppercase tracking-wide text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply Correction
        </button>
      </div>
    </div>
  )
}

