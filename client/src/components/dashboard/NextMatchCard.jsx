import { CalendarDays } from 'lucide-react'

// No per-player match schedule/availability API exists yet, so this always
// renders the empty state — wire up a real `match` prop once one does.
export default function NextMatchCard({ match = null }) {
  return (
    <div id="matches" className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm scroll-mt-24">
      <h2 className="text-xl font-semibold text-white">Next Match</h2>

      {match ? (
        <div className="mt-4 text-slate-300">Match details go here.</div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-slate-500" />
          <p className="text-sm text-slate-300">No matches scheduled yet.</p>
        </div>
      )}
    </div>
  )
}
