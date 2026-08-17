import { Link } from 'react-router-dom'
import { useHomeDiscovery } from '../../hooks/useHomeDiscovery.js'
import FeaturedLiveMatch from './FeaturedLiveMatch.jsx'
import MatchCard from '../matches/MatchCard.jsx'
import { StatsErrorState } from '../stats/StatsStates.jsx'
import ScrollReveal from '../common/ScrollReveal.jsx'
import StaggerItem from '../common/StaggerItem.jsx'
import { energeticReveal, staggerContainer } from '../../lib/revealVariants.js'

// Homepage match discovery. One bounded
// GET /matches/home call feeds all three previews; a failure here is
// contained to this section and never crashes the rest of the
// homepage, since HomePage.jsx renders this as one self-contained subtree.

function PreviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ))}
    </div>
  )
}

function PreviewRow({ title, matches, emptyMessage, viewAllTo }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <Link to={viewAllTo} className="text-xs font-bold uppercase tracking-wide text-emerald-300 hover:text-emerald-200">
          View All
        </Link>
      </div>
      {matches.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-emerald-400/15 bg-emerald-900/20 px-6 py-8 text-center text-sm text-emerald-100/60">
          {emptyMessage}
        </p>
      ) : (
        <ScrollReveal
          variant={staggerContainer(0.08)}
          amount={0.2}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {matches.map((m) => (
            <StaggerItem key={m.id}>
              <MatchCard match={m} />
            </StaggerItem>
          ))}
        </ScrollReveal>
      )}
    </div>
  )
}

export default function MatchActivitySection() {
  const { data, loading, error, retry } = useHomeDiscovery()

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-10 px-6 py-6 lg:px-10">
        <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
        <PreviewSkeleton />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full px-6 py-6 lg:px-10">
        <StatsErrorState message={error || "Couldn't load match activity."} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-10 px-6 py-6 lg:px-10">
      <ScrollReveal variant={energeticReveal} amount={0.3}>
        <FeaturedLiveMatch match={data.featuredLiveMatch} />
      </ScrollReveal>
      <PreviewRow title="Upcoming Matches" matches={data.upcomingMatches} emptyMessage="No upcoming matches scheduled yet." viewAllTo="/matches?tab=UPCOMING" />
      <PreviewRow title="Recent Results" matches={data.recentResults} emptyMessage="No completed matches yet." viewAllTo="/matches?tab=RESULTS" />
    </div>
  )
}
