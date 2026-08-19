import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import SiteFooter from '../../components/home/SiteFooter.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import GroundCard from '../../components/ground/GroundCard.jsx'
import GroundCardSkeleton from '../../components/ground/GroundCardSkeleton.jsx'
import GroundFiltersBar from '../../components/ground/GroundFiltersBar.jsx'
import LandmarkSearch from '../../components/ground/LandmarkSearch.jsx'
import KmRangeSlider from '../../components/ground/KmRangeSlider.jsx'
import { useAllGrounds } from '../../hooks/useAllGrounds.js'
import { useGroundSearch } from '../../hooks/useGroundSearch.js'
import { DEFAULT_RADIUS_KM, DEFAULT_PAGE_SIZE } from '../../models/groundDiscovery.model.js'
import { fadeUpSoft } from '../../lib/revealVariants.js'

// "First sort by city" (Amazon/Flipkart-style sort bar) — city is the
// default and first option; name/newest are the same two real sorts the
// homepage's browse views already use. No fake "Most Popular"/"Best Rated"
// — those fields don't exist in the schema.
const SORT_OPTIONS = [
  { value: 'city', label: 'City (A–Z)' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'newest', label: 'Newest' },
]

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-emerald-100/70">{message}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-red-300/80">{message || 'Something went wrong loading grounds.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
      >
        Retry
      </button>
    </div>
  )
}

// "List our all registered grounds... first sort by city... if user wants,
// give a landmark, list out grounds around it... range selector of
// kilometers." Two modes, exactly one active at a time:
//   - browse: every ACTIVE ground (useAllGrounds), sorted by the chosen
//     SORT_OPTIONS value — the default landing state.
//   - search: grounds within `radiusKm` of a resolved landmark/GPS point
//     (useGroundSearch's existing 'nearby' mode) — entered once
//     LandmarkSearch resolves real coordinates.
// Facilities filtering (GroundFiltersBar) applies client-side over whichever
// mode is active, same as DiscoveryPage's own "Find Your Perfect Ground".
export default function GroundsPage() {
  const [browseSort, setBrowseSort] = useState('city')
  const [selectedFacilities, setSelectedFacilities] = useState([])
  const [searchCoords, setSearchCoords] = useState(null) // { latitude, longitude, label } once resolved
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)

  const browse = useAllGrounds({ sort: browseSort, limit: DEFAULT_PAGE_SIZE })
  const search = useGroundSearch()

  const isSearchMode = searchCoords !== null
  const active = isSearchMode
    ? { grounds: search.grounds, loading: search.loading, loadingMore: search.loadingMore, error: search.error, hasMore: search.hasMore, loadMore: search.loadMore, retry: search.retry }
    : { grounds: browse.grounds, loading: browse.loading, loadingMore: browse.loadingMore, error: browse.error, hasMore: browse.hasMore, loadMore: browse.loadMore, retry: browse.retry }

  // Client-side, over the already-fetched page — same semantics as
  // DiscoveryPage's own facility filter: a ground must have every checked
  // facility to remain visible.
  const visibleGrounds = useMemo(
    () => (selectedFacilities.length === 0 ? active.grounds : active.grounds.filter((g) => selectedFacilities.every((f) => (g.amenities || []).includes(f)))),
    [active.grounds, selectedFacilities],
  )

  const handleResolved = ({ latitude, longitude, label }) => {
    setSearchCoords({ latitude, longitude, label })
    search.searchNearby(latitude, longitude, radiusKm)
  }

  // Shared by both the pre-search slider (inside LandmarkSearch) and the
  // post-search slider below — before a landmark/GPS point is resolved this
  // just remembers the chosen radius for the next search; after, it
  // re-runs the same nearby search at the new radius.
  const handleRadiusCommit = (km) => {
    setRadiusKm(km)
    if (searchCoords) search.searchNearby(searchCoords.latitude, searchCoords.longitude, km)
  }

  const handleBackToAll = () => {
    setSearchCoords(null)
    search.reset()
    setSelectedFacilities([])
  }

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-32 pb-20 lg:px-10">
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex flex-col items-start gap-3 text-left">
          <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">All Grounds</span>
          <h1 className="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            Every Ground Registered on LOC
          </h1>
          <p className="max-w-2xl text-emerald-100/60">Browse every ground sorted by city, or search around a landmark and set your travel radius.</p>
        </ScrollReveal>

        {/* Amazon/Flipkart-style layout — sort/search/radius/filter controls
            in one compact horizontal bar above the results, wrapping onto a
            second line (no horizontal scrollbar) on narrow screens rather
            than stacking beside the grid (which left the results column
            too narrow for even one card below the lg breakpoint). */}
        <div className="rounded-2xl border border-emerald-400/10 bg-white/3 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {!isSearchMode ? (
              <>
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor="grounds-sort" className="text-[11px] font-semibold whitespace-nowrap text-emerald-100/50 uppercase">
                    Sort
                  </label>
                  <select
                    id="grounds-sort"
                    value={browseSort}
                    onChange={(e) => setBrowseSort(e.target.value)}
                    className="h-8 rounded-full border border-emerald-400/20 bg-white/5 px-3 text-xs font-semibold text-emerald-100/80 focus:border-emerald-400/50 focus:outline-none"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-loc-dark text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="shrink-0 text-[11px] font-semibold text-emerald-100/40 uppercase">or</span>

                <LandmarkSearch onResolved={handleResolved} />
              </>
            ) : (
              <div className="flex shrink-0 items-center gap-2 text-xs text-emerald-100/70">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="whitespace-nowrap">
                  Within {radiusKm} km of <span className="font-semibold text-white">{searchCoords.label}</span>
                </span>
                <button type="button" onClick={handleBackToAll} className="font-semibold whitespace-nowrap text-emerald-400 underline-offset-2 hover:underline">
                  Back to All
                </button>
              </div>
            )}

            <KmRangeSlider value={radiusKm} onCommit={handleRadiusCommit} compact />

            {active.grounds.length > 0 && (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-semibold whitespace-nowrap text-emerald-100/50 uppercase">Filter</span>
                <GroundFiltersBar grounds={active.grounds} selectedFacilities={selectedFacilities} onChange={setSelectedFacilities} />
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          {active.grounds.length > 0 && (
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-100/50">
              {visibleGrounds.length} {visibleGrounds.length === 1 ? 'Ground' : 'Grounds'}
            </p>
          )}

          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {active.loading && Array.from({ length: 6 }).map((_, i) => <GroundCardSkeleton key={i} />)}
            {!active.loading && !active.error && visibleGrounds.map((ground) => <GroundCard key={ground.publicGroundId} ground={ground} />)}
          </div>

          {!active.loading && active.error && <ErrorState message={active.error} onRetry={active.retry} />}
          {!active.loading && !active.error && active.grounds.length === 0 && (
            <EmptyState message={isSearchMode ? 'No cricket grounds found within this radius. Try widening it.' : 'No grounds are registered yet.'} />
          )}
          {!active.loading && !active.error && active.grounds.length > 0 && visibleGrounds.length === 0 && (
            <p className="text-emerald-100/60">No grounds match the selected facilities.</p>
          )}

          {!active.loading && !active.error && active.hasMore && (
            <button
              type="button"
              onClick={active.loadMore}
              disabled={active.loadingMore}
              className="self-center rounded-full border border-emerald-400/20 px-6 py-2.5 text-sm font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-50"
            >
              {active.loadingMore ? 'Loading…' : 'Load More'}
            </button>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
