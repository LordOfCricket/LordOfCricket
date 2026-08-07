import { useMemo, useState } from 'react'
import { getPlayer } from '../../models/umpireMatch.model.js'
import { groupDeliveriesByOver } from '../../models/matchStats.model.js'

function resultText(d) {
  if (d.isDeadBall) return 'Dead Ball'
  if (d.wicket) return 'WICKET'
  if (d.illegal?.type === 'wide') return `Wide${d.illegal.runs > 1 ? ` +${d.illegal.runs - 1}` : ''}`
  if (d.illegal?.type === 'no-ball') return `No Ball${d.runsBat ? ` +${d.runsBat}` : ''}`
  if (d.extra?.type === 'bye') return `${d.extra.runs} Bye${d.extra.runs === 1 ? '' : 's'}`
  if (d.extra?.type === 'leg-bye') return `${d.extra.runs} Leg Bye${d.extra.runs === 1 ? '' : 's'}`
  if (d.totalRuns === 0) return 'Dot'
  return `${d.totalRuns} Run${d.totalRuns === 1 ? '' : 's'}`
}

function resultClass(d) {
  if (d.wicket) return 'text-rose-300'
  if (d.runsBat === 6) return 'text-fuchsia-300'
  if (d.runsBat === 4) return 'text-amber-300'
  if (d.illegal || d.extra) return 'text-amber-200/80'
  return 'text-emerald-100'
}

export default function DeliveryHistoryList({ match, innings, corrections, onSelectDelivery }) {
  const groups = useMemo(() => groupDeliveriesByOver(innings.deliveries), [innings.deliveries])
  const [jumpTo, setJumpTo] = useState('')
  const correctedIds = useMemo(() => new Set(corrections.map((c) => c.entryId)), [corrections])

  const visibleGroups = jumpTo ? groups.filter((g) => String(g.over) === jumpTo) : groups

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <label htmlFor="edit-score-jump" className="text-xs font-semibold uppercase tracking-wide text-emerald-100/60">
          Jump to Over
        </label>
        <select
          id="edit-score-jump"
          value={jumpTo}
          onChange={(e) => setJumpTo(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-sm text-white"
        >
          <option value="">All</option>
          {groups.map((g) => (
            <option key={g.over} value={g.over}>
              Over {g.over}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groups.length === 0 && <p className="text-sm text-emerald-100/40">No deliveries recorded yet.</p>}
        {visibleGroups.map((group) => (
          <div key={group.over} className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-300">Over {group.over}</p>
            <div className="space-y-1.5">
              {group.deliveries.map((d) => {
                const striker = getPlayer(match, d.strikerId)
                const bowler = getPlayer(match, d.bowlerId)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectDelivery(d.id)}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-all hover:bg-white/10 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs font-semibold text-emerald-100/50">
                        {d.over - 1}.{d.ball - 1}
                      </span>
                      <span className="text-sm text-white">
                        {striker?.name || '—'} <span className="text-emerald-100/40">→</span> {bowler?.name || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {correctedIds.has(d.id) && (
                        <span className="text-xs text-amber-300" title="Corrected">
                          ✏
                        </span>
                      )}
                      <span className={`text-sm font-bold ${resultClass(d)}`}>{resultText(d)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
