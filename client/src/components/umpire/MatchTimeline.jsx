import { generateBasicCommentary, describeMatchEvent } from '../../models/matchCommentary.model.js'
import { getTimeline } from '../../models/matchStats.model.js'

// Events that are just scoring/selection plumbing — noisy in a commentary-style feed.
const SILENT_EVENTS = new Set(['batsman-in', 'bowler-change'])

export default function MatchTimeline({ match, innings, corrections = [] }) {
  const correctedIds = new Set(corrections.map((c) => c.entryId))
  const recent = getTimeline(innings)
    .filter((entry) => entry.kind === 'delivery' || (!SILENT_EVENTS.has(entry.event) && !entry.payload?.voided))
    .reverse()
    .slice(0, 30)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-100/70">Match Timeline</h2>
      </div>

      {recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-emerald-100/40">No deliveries recorded yet.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto px-2 py-2">
          {recent.map((entry) => (
            <li key={entry.id} className="rounded-xl px-3 py-2.5 hover:bg-white/5">
              <p className="text-xs font-semibold text-emerald-300">
                {entry.over - 1}.{entry.ball - 1}
                {entry.kind === 'delivery' && (entry.wicket ? ' — WICKET' : entry.runsBat === 6 ? ' — SIX' : entry.runsBat === 4 ? ' — FOUR' : '')}
                {correctedIds.has(entry.id) && <span className="ml-2 text-amber-300">✏ Corrected</span>}
              </p>
              <p className="mt-0.5 text-sm text-emerald-50/90">
                {entry.kind === 'delivery' ? generateBasicCommentary(entry, match) : describeMatchEvent(entry, match)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
