import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePublicMatches } from '../../hooks/usePublicMatches.js'
import { CATEGORIES } from '../../models/matchDiscovery.model.js'
import MatchCard from '../../components/matches/MatchCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'

const PAGE_SIZE = 12

const EMPTY_STATE = {
  LIVE: { message: 'No matches are live right now.', actionLabel: 'View Upcoming Matches', actionTab: 'UPCOMING' },
  UPCOMING: { message: 'No upcoming matches scheduled yet.', actionLabel: 'Check Recent Results', actionTab: 'RESULTS' },
  RESULTS: { message: 'No completed matches yet.', actionLabel: 'View Upcoming Matches', actionTab: 'UPCOMING' },
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-loc-card-dark p-5" role="status" aria-label="Loading match">
      <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-8 w-full animate-pulse rounded-full bg-white/5" />
    </div>
  )
}

export default function MatchesPage() {
  useEffect(() => {
    document.title = 'Matches — Lord Of Cricket'
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const [offset, setOffset] = useState(0)

  // Stable, deliberate default: always LIVE, never conditional on
  // whether live matches currently exist — that would need an extra fetch
  // before the tab bar could render and risks a jarring post-load tab jump.
  const tab = CATEGORIES.some((c) => c.key === searchParams.get('tab')) ? searchParams.get('tab') : 'LIVE'

  // The LIVE tab refreshes itself every ~20s while visible (paused
  // when hidden, via the shared transport); UPCOMING/RESULTS fetch once per
  // param change, no reason to auto-poll a fixture list
  // or a results archive.
  const { result, loading, error, retry } = usePublicMatches({ category: tab, limit: PAGE_SIZE, offset, pollIntervalMs: tab === 'LIVE' ? 20000 : undefined })

  const selectTab = (key) => {
    setOffset(0)
    setSearchParams({ tab: key }, { replace: true })
  }

  const empty = EMPTY_STATE[tab]

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-32 pb-20 lg:px-10">
        {/* Page Title */}
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="bg-linear-to-r from-loc-warmwhite to-loc-grass bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            Cricket Matches
          </h1>
          <p className="max-w-2xl text-loc-text2-dark">Follow live, upcoming, and completed matches on Lord Of Cricket.</p>
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="flex gap-1 rounded-full border border-loc-gold/20 bg-loc-stadium/20 p-1" role="tablist" aria-label="Match category">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={tab === c.key}
              onClick={() => selectTab(c.key)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab === c.key
                  ? 'bg-loc-stadium text-loc-warmwhite shadow-lg shadow-loc-gold/25'
                  : 'text-loc-text2-dark hover:bg-loc-stadium/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Matches Content */}
        <div>
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && <StatsErrorState message={error} onRetry={retry} />}

          {!loading && !error && result && result.items.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-loc-gold/20 bg-loc-stadium/10 px-6 py-16 text-center">
              <p className="text-sm text-loc-text2-dark">{empty.message}</p>
              <button
                type="button"
                onClick={() => selectTab(empty.actionTab)}
                className="rounded-full bg-loc-stadium px-5 py-2 text-xs font-bold uppercase tracking-wide text-loc-warmwhite transition-colors hover:bg-loc-stadium-hover"
              >
                {empty.actionLabel}
              </button>
            </div>
          )}

          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>

              {result.pagination.total > PAGE_SIZE && (
                <div className="mt-8 flex items-center justify-between gap-4 rounded-full border border-loc-gold/20 bg-loc-stadium/10 px-6 py-4">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="rounded-full border border-loc-gold/20 px-4 py-2 text-sm font-semibold text-loc-warmwhite transition-colors hover:bg-loc-stadium/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-loc-text2-dark">
                    {offset + 1}–{Math.min(offset + PAGE_SIZE, result.pagination.total)} of {result.pagination.total}
                  </span>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= result.pagination.total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="rounded-full border border-loc-gold/20 px-4 py-2 text-sm font-semibold text-loc-warmwhite transition-colors hover:bg-loc-stadium/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
