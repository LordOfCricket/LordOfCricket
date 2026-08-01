import { BarChart3 } from 'lucide-react'

// No career-stat aggregation exists over deliveries/wickets yet, so this
// always renders the empty state — swap in real stat tiles once that query exists.
export default function CareerOverview() {
  return (
    <div id="career" className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm scroll-mt-24">
      <h2 className="text-xl font-semibold text-white">Career Overview</h2>

      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-300">Your cricket statistics will appear after your first official recorded match.</p>
      </div>
    </div>
  )
}
