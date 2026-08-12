import { Star } from 'lucide-react'
import UmpireLayout from '../../components/umpire-dashboard/UmpireLayout.jsx'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import StatTile from '../../components/stats/StatTile.jsx'
import { useUmpireStatistics } from '../../hooks/useUmpireStatistics.js'

export default function UmpireStatisticsPage() {
  const { loading, error, matchesOfficiated, upcomingAssignments, ratingAvg, ratingCount, matchesThisMonth, groundsOfficiatedAt, refresh } =
    useUmpireStatistics()

  return (
    <UmpireLayout title="My Statistics" subtitle="Your umpiring activity at a glance.">
      {loading && <StatsLoadingGrid tiles={4} />}
      {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Matches Officiated" value={matchesOfficiated} emphasis />
            <StatTile label="Upcoming Assignments" value={upcomingAssignments} />
            <StatTile label="Matches This Month" value={matchesThisMonth} />
            <StatTile label="Grounds Officiated At" value={groundsOfficiatedAt} />
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">Rating</h2>
            {ratingCount > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-2xl font-bold text-amber-300">
                  <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                  {Number(ratingAvg).toFixed(2)}
                </span>
                <span className="text-sm text-slate-400">
                  from {ratingCount} review{ratingCount === 1 ? '' : 's'}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Not available yet — no umpire feedback has been submitted for you.</p>
            )}
          </div>
        </div>
      )}
    </UmpireLayout>
  )
}
