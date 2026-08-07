import { BarChart3, AlertCircle } from 'lucide-react'

// Shared loading/error/empty widgets for every career-statistics surface
// (Dashboard Career Overview, Profile tabs). Phase 7 rule: never show a "0"
// or "0.00" while data is still loading or failed to load — those are
// meaningfully different from an actual zero-value career statistic.

export function StatsLoadingGrid({ tiles = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="status" aria-label="Loading statistics">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ))}
    </div>
  )
}

export function StatsErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-400/20 bg-red-500/5 px-6 py-10 text-center">
      <AlertCircle className="h-8 w-8 text-red-300" />
      <p className="text-sm text-red-100">{message || "Couldn't load career statistics."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-red-300/30 px-4 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/10"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function StatsEmptyState({ label = 'Your cricket statistics' }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
      <BarChart3 className="h-8 w-8 text-slate-500" />
      <p className="text-sm text-slate-300">{label} will appear after your first LOC match is finalized.</p>
    </div>
  )
}
