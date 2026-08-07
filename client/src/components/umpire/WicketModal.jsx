import { useState } from 'react'
import { DISMISSAL_TYPES, getTeamPlayers, getPlayer } from '../../models/umpireMatch.model.js'
import { getAllowedDismissals } from '../../models/matchEngine.model.js'

function OptionGrid({ items, selectedId, onSelect }) {
  return (
    <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-all ${
            selectedId === item.id ? 'border-emerald-400/50 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}

export default function WicketModal({ open, onClose, match, innings, onConfirm }) {
  const [type, setType] = useState(null)
  const [fielderId, setFielderId] = useState(null)
  const [batsmanOutId, setBatsmanOutId] = useState(null)
  const [direct, setDirect] = useState(false)
  const [runsCompleted, setRunsCompleted] = useState(0)

  if (!open) return null

  const allowed = getAllowedDismissals(innings, null)
  const dismissals = DISMISSAL_TYPES.filter((d) => allowed.includes(d.id))
  const fielders = getTeamPlayers(match, innings.bowlingTeamId)
  const batsmen = [innings.ends.strikerEnd, innings.ends.nonStrikerEnd].filter(Boolean).map((id) => getPlayer(match, id))

  const reset = () => {
    setType(null)
    setFielderId(null)
    setBatsmanOutId(null)
    setDirect(false)
    setRunsCompleted(0)
  }

  const close = () => {
    reset()
    onClose()
  }

  const confirm = () => {
    if (!type) return
    onConfirm({
      type,
      fielderId: type === 'caught' || type === 'stumped' || type === 'run-out' ? fielderId : null,
      batsmanOutId: type === 'run-out' ? batsmanOutId || innings.ends.strikerEnd : null,
      direct: type === 'run-out' ? direct : false,
      runsCompleted: type === 'run-out' ? runsCompleted : 0,
    })
    close()
  }

  const canConfirm = Boolean(type) && (type !== 'caught' || fielderId) && (type !== 'run-out' || batsmanOutId)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-emerald-950 p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-rose-300">Wicket</h2>
          <button type="button" onClick={close} className="text-emerald-100/50 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {dismissals.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setType(d.id)}
              className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 ${
                type === d.id ? 'border-rose-400/60 bg-rose-500/20 text-rose-200' : 'border-white/10 bg-white/5 text-emerald-100/80 hover:bg-white/10'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {type === 'caught' && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Caught By</p>
            <OptionGrid items={fielders} selectedId={fielderId} onSelect={setFielderId} />
          </div>
        )}

        {type === 'stumped' && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Wicketkeeper (optional)</p>
            <OptionGrid items={fielders} selectedId={fielderId} onSelect={setFielderId} />
          </div>
        )}

        {type === 'run-out' && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Who Was Dismissed?</p>
              <OptionGrid items={batsmen} selectedId={batsmanOutId} onSelect={setBatsmanOutId} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Fielder Involved (optional)</p>
              <OptionGrid items={fielders} selectedId={fielderId} onSelect={setFielderId} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">Direct Hit?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirect(true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold ${direct ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setDirect(false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold ${!direct ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
                >
                  No
                </button>
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
                    className={`h-11 w-11 rounded-lg text-sm font-bold ${runsCompleted === n ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 text-emerald-100/70'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Wicket
        </button>
      </div>
    </div>
  )
}
