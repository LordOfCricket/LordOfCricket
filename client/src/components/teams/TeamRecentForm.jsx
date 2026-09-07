import { useNavigate } from 'react-router-dom'

// Newest-first W/L/T/NR sequence. Text labels
// carry the meaning, not color alone (accessibility) — color is a secondary
// reinforcement only.
const RESULT_STYLE = {
  W: 'bg-emerald-500/15 text-emerald-300',
  L: 'bg-rose-500/15 text-rose-300',
  T: 'bg-amber-500/15 text-amber-300',
  NR: 'bg-white/10 text-slate-300',
}

export default function TeamRecentForm({ recentForm }) {
  const navigate = useNavigate()

  if (recentForm.length === 0) {
    return <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-6 text-center text-sm text-slate-300">No official results yet.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Recent form, newest first">
      {recentForm.map((f) => (
        <button
          key={f.matchId}
          type="button"
          onClick={() => navigate(`/matches/${f.matchId}/summary`)}
          title={f.result === 'W' ? 'Win' : f.result === 'L' ? 'Loss' : f.result === 'T' ? 'Tie' : 'No Result'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-transform hover:scale-105 ${RESULT_STYLE[f.result] || RESULT_STYLE.NR}`}
        >
          {f.result}
        </button>
      ))}
    </div>
  )
}
