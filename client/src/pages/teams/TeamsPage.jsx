import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Shield } from 'lucide-react'
import { usePublicTeams } from '../../hooks/usePublicTeams.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import TeamCard from '../../components/teams/TeamCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'

const PAGE_SIZE = 12

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-loc-card-dark p-5" role="status" aria-label="Loading team">
      <div className="h-20 w-20 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
      <div className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
    </div>
  )
}

export default function TeamsPage() {
  useEffect(() => {
    document.title = 'Teams — Lord Of Cricket'
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [offset, setOffset] = useState(0)

  const debouncedQuery = useDebouncedValue(query, 300)
  const { result, loading, error } = usePublicTeams({ search: debouncedQuery || undefined, limit: PAGE_SIZE, offset })

  // Reflects the search term into the URL — shareable, back-button-friendly.
  useEffect(() => {
    const next = {}
    if (debouncedQuery) next.search = debouncedQuery
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const changeQuery = (value) => {
    setOffset(0)
    setQuery(value)
  }
  const clearSearch = () => changeQuery('')

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
            Cricket Teams
          </h1>
          <p className="max-w-2xl text-loc-text2-dark">Discover and explore cricket teams on Lord Of Cricket.</p>
        </ScrollReveal>

        {/* Compare Teams Link */}
        <div className="flex justify-center">
          <Link
            to="/teams/compare"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-loc-stadium px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-loc-warmwhite transition-all duration-200 hover:bg-loc-stadium-hover"
          >
            <Shield className="h-4 w-4" />
            Compare Teams
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-loc-gold" />
            <input
              type="search"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Search teams..."
              aria-label="Search teams"
              className="w-full rounded-2xl border border-loc-gold/20 bg-loc-stadium/20 py-3 pl-12 pr-4 text-sm text-loc-warmwhite placeholder:text-loc-muted-dark focus:border-loc-gold/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Teams Grid */}
        <div>
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && <StatsErrorState message={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && result && result.items.length === 0 && debouncedQuery && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-loc-gold/20 bg-loc-stadium/10 px-6 py-16 text-center">
              <p className="text-sm text-loc-text2-dark">No teams found for &ldquo;{debouncedQuery}&rdquo;.</p>
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-full bg-loc-stadium px-5 py-2 text-xs font-bold uppercase tracking-wide text-loc-warmwhite transition-colors hover:bg-loc-stadium-hover"
              >
                Clear Search
              </button>
            </div>
          )}

          {!loading && !error && result && result.items.length === 0 && !debouncedQuery && (
            <div className="rounded-2xl border border-dashed border-loc-gold/20 bg-loc-stadium/10 px-6 py-16 text-center text-sm text-loc-text2-dark">No teams yet.</div>
          )}

          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((team) => (
                  <TeamCard key={team.id} team={team} />
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
