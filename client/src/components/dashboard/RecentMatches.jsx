import { History } from 'lucide-react'

export default function RecentMatches({ matches = [] }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-white">Recent Matches</h2>

      {matches.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
          <History className="h-8 w-8 text-slate-500" />
          <p className="text-sm text-slate-300">No matches recorded yet.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">
              {match.opponent} — {match.result}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
