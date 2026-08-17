// One commentary line. Emphasis for boundaries/wickets/milestones/
// results never relies on color alone: the badge text and bold
// weight carry the meaning too.
const EMPHASIS_TAGS = ['WICKET', 'FOUR', 'SIX', 'FIFTY', 'HUNDRED', 'RESULT']

const EMPHASIS_STYLES = {
  WICKET: 'border-rose-400/30 bg-rose-500/10',
  FOUR: 'border-amber-400/30 bg-amber-500/10',
  SIX: 'border-fuchsia-400/30 bg-fuchsia-500/10',
  FIFTY: 'border-emerald-400/30 bg-emerald-500/10',
  HUNDRED: 'border-emerald-400/30 bg-emerald-500/10',
  RESULT: 'border-emerald-400/30 bg-emerald-500/10',
}

function emphasisClass(tags) {
  for (const key of EMPHASIS_TAGS) {
    if (tags?.includes(key)) return EMPHASIS_STYLES[key]
  }
  return 'border-white/10 bg-white/5'
}

function badgeLabel(entry) {
  if (entry.ballLabel) return entry.ballLabel
  if (entry.type === 'OVER_END') return 'OVER'
  if (entry.type === 'INNINGS_END' || entry.type === 'INNINGS_BREAK') return 'INNS'
  if (entry.type === 'MATCH_RESULT') return 'FT'
  return '•'
}

export default function CommentaryEntry({ entry }) {
  const emphasized = entry.tags?.some((t) => EMPHASIS_TAGS.includes(t))
  return (
    <div className={`flex gap-3 rounded-xl border px-3 py-2.5 ${emphasisClass(entry.tags)}`}>
      <span className="w-12 shrink-0 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{badgeLabel(entry)}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${emphasized ? 'font-semibold text-white' : 'text-slate-200'}`}>{entry.text}</p>
        {entry.score && (
          <p className="mt-0.5 text-xs text-slate-500">
            {entry.score.runs}/{entry.score.wickets}
          </p>
        )}
      </div>
    </div>
  )
}
