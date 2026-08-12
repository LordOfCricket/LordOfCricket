import { Link } from 'react-router-dom'
import { CalendarClock, Flag } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { useUmpireDashboard } from '../../hooks/useUmpireDashboard.js'
import UmpireLayout from '../../components/umpire-dashboard/UmpireLayout.jsx'
import AssignmentCard from '../../components/umpire-dashboard/AssignmentCard.jsx'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import StatTile from '../../components/stats/StatTile.jsx'

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function UmpireDashboardPage() {
  const { user } = useAuth()
  const { loading, error, upcomingAssignmentsCount, upcomingAssignments, matchesOfficiated, ratingAvg, ratingCount, refresh } = useUmpireDashboard()
  const firstName = user?.name?.split(' ')[0] || 'Umpire'

  return (
    <UmpireLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {timeGreeting()}, {firstName}
          </h1>
          <p className="mt-2 text-slate-300">Your Officiating Overview</p>
        </div>

        <Link
          to="/umpire/find-matches"
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-linear-to-r from-emerald-400 to-emerald-600 px-6 text-sm font-bold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
        >
          <Flag className="h-4 w-4" />
          Find Umpiring Opportunities
        </Link>
      </div>

      <div className="mt-8">
        {loading && <StatsLoadingGrid tiles={3} />}
        {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}
        {!loading && !error && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="Matches Officiated" value={matchesOfficiated} emphasis />
            <StatTile label="Upcoming Assignments" value={upcomingAssignmentsCount} />
            <StatTile label="Rating" value={ratingCount > 0 ? `${Number(ratingAvg).toFixed(1)} / 5` : 'Not rated yet'} />
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white">Upcoming Matches</h2>
          {upcomingAssignments.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
              <CalendarClock className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-300">You don't have any upcoming umpire assignments.</p>
              <Link to="/umpire/find-matches" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                Find grounds that need an umpire →
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {upcomingAssignments.map((a) => (
                <AssignmentCard key={a.match_id} assignment={a} compact={false} showActions={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </UmpireLayout>
  )
}
