import { generateBasicCommentary } from '../../models/matchCommentary.model.js'

export default function MatchTimeline({ match, innings }) {
  const recent = [...innings.deliveries].reverse().slice(0, 30)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-100/70">Ball-by-Ball</h2>
      </div>

      {recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-emerald-100/40">No deliveries recorded yet.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto px-2 py-2">
          {recent.map((d) => (
            <li key={d.id} className="rounded-xl px-3 py-2.5 hover:bg-white/5">
              <p className="text-xs font-semibold text-emerald-300">
                {d.over - 1}.{d.ball - 1}
                {d.wicket ? ' — WICKET' : d.runsBat === 6 ? ' — SIX' : d.runsBat === 4 ? ' — FOUR' : ''}
              </p>
              <p className="mt-0.5 text-sm text-emerald-50/90">{generateBasicCommentary(d, match)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
