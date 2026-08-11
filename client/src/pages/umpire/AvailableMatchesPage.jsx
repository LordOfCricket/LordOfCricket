import { ListChecks } from 'lucide-react'
import { useAvailableMatches } from '../../hooks/useAvailableMatches.js'
import UmpireLayout from '../../components/umpire-dashboard/UmpireLayout.jsx'
import AvailableMatchCard from '../../components/umpire-dashboard/AvailableMatchCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'

function CardSkeleton() {
  return <div className="h-64 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
}

export default function AvailableMatchesPage() {
  const { matches, loading, error, applyingId, applyResults, apply, refresh } = useAvailableMatches()

  return (
    <UmpireLayout title="Available Matches" subtitle="Matches that still need an umpire — apply for an open slot.">
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}

      {!loading && !error && matches.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
          <ListChecks className="h-8 w-8 text-slate-500" />
          <p className="text-slate-300">No umpire assignments available right now.</p>
          <p className="text-sm text-slate-500">Check back later for upcoming matches.</p>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <AvailableMatchCard
              key={match.id}
              match={match}
              applying={applyingId === match.id}
              result={applyResults[match.id]}
              onApply={apply}
            />
          ))}
        </div>
      )}
    </UmpireLayout>
  )
}
