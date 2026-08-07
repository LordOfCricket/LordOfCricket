import { useState } from 'react'
import { useMatchCommentary } from '../../hooks/useMatchCommentary.js'
import CommentaryEntry from './CommentaryEntry.jsx'

// Phase 12 — the professional commentary feed. Filters operate on
// structured tags/types (Part 51), never by parsing commentary text.
// Newest-first, matching the existing MatchTimelinePanel convention.
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'BOUNDARIES', label: 'Boundaries' },
  { key: 'WICKETS', label: 'Wickets' },
  { key: 'MILESTONES', label: 'Milestones' },
]

function matchesFilter(entry, filter) {
  if (filter === 'ALL') return true
  if (filter === 'BOUNDARIES') return entry.tags?.includes('FOUR') || entry.tags?.includes('SIX')
  if (filter === 'WICKETS') return entry.type === 'WICKET'
  if (filter === 'MILESTONES') return entry.type === 'MILESTONE'
  return true
}

export default function CommentaryPanel({ matchId, inningsId }) {
  const [filter, setFilter] = useState('ALL')
  const { entries, loading, error, hasMore, loadMore, connected } = useMatchCommentary(matchId, { inningsId })

  const filtered = entries.filter((e) => matchesFilter(e, filter))

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commentary</p>
        <span className="text-[11px] text-slate-500">{connected ? 'Live' : 'Reconnecting…'}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-950/40 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
              filter === f.key ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 && <div className="h-24 animate-pulse rounded-xl bg-white/5" role="status" aria-label="Loading commentary" />}
      {error && filtered.length === 0 && <p className="text-sm text-rose-300">Couldn&apos;t load commentary.</p>}
      {!loading && !error && filtered.length === 0 && <p className="text-sm text-slate-400">No commentary yet.</p>}

      <div className="space-y-1.5">
        {filtered.map((entry) => (
          <CommentaryEntry key={entry.id} entry={entry} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="w-full rounded-full border border-white/10 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          Load older commentary
        </button>
      )}
    </div>
  )
}
