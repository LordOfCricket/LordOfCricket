import logo from '../../assets/logo.png'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import StatCounter from '../../components/homepage/StatCounter.jsx'
import GroundCard from '../../components/ground/GroundCard.jsx'
import GroundCardSkeleton from '../../components/ground/GroundCardSkeleton.jsx'
import CitySearch from '../../components/ground/CitySearch.jsx'
import { useGroundsByCity } from '../../hooks/useGroundsByCity.js'
import { useAllGrounds } from '../../hooks/useAllGrounds.js'
import { STATS } from '../../models/homepage.model.js'
import { fadeUpSoft, staggerContainer, atmosphereReveal } from '../../lib/revealVariants.js'

// Phase 13 — Level 1: the LOC PLATFORM homepage (Step 2). Explains LOC and
// helps a visitor find a ground; it deliberately does not present LOC
// itself as one physical ground (that's GroundHomePage, Level 2, at
// /grounds/:publicGroundId). STATS moved here from the old single-ground
// About section — "Turf Pitches: 6" etc. described one specific ground's
// facilities, not a platform-wide fact, so presenting it unchanged on every
// future ground's page would be actively wrong the moment a second ground
// exists. There's no backend field for real per-ground stats yet (Phase 12
// didn't add one), so rather than inventing one or fabricating per-ground
// numbers, this keeps the existing counter treatment as honest, clearly
// platform-scoped copy instead.
//
// Location is city-based (post-report revision), not GPS/lat-lng — see
// CitySearch.jsx/useGroundsByCity.js. The distance-based /grounds/nearby
// flow (useNearbyGrounds.js, LocationPicker/RadiusFilter) was removed
// entirely rather than left as dead, unreferenced code.
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-emerald-100/70">No cricket grounds found in that city.</p>
      <p className="text-sm text-emerald-100/50">Try a different spelling, or search a nearby city.</p>
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

// The default browse list — every ground already registered on LOC, shown
// unconditionally right below the hero (GET /api/grounds, no search
// required). Distinct from the city-search results further down, which
// only appear once the visitor searches.
function RegisteredGrounds() {
  const { grounds, loading, loadingMore, error, loadMore, hasMore, retry } = useAllGrounds()

  return (
    <ScrollReveal as="div" variant={atmosphereReveal} amount={0.2} className="flex w-full max-w-6xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Registered Grounds</span>
        <h2 className="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
          Cricket grounds on LOC
        </h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <GroundCardSkeleton key={i} />)}
        {!loading && !error && grounds.map((ground) => <GroundCard key={ground.publicGroundId} ground={ground} />)}
      </div>

      {!loading && error && <ErrorState message={error} onRetry={retry} />}
      {!loading && !error && grounds.length === 0 && (
        <p className="text-emerald-100/60">No grounds have registered on LOC yet.</p>
      )}
      {!loading && !error && hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="rounded-full border border-emerald-400/20 px-6 py-2.5 text-sm font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load More'}
        </button>
      )}
    </ScrollReveal>
  )
}

export default function DiscoveryPage() {
  const { city, searched, grounds, loading, loadingMore, error, search, loadMore, hasMore, retry, reset } = useGroundsByCity()

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative flex flex-col items-center gap-16 px-6 pt-32 pb-16 lg:px-10">
        {/* Platform intro */}
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">LOC — Lord Of Cricket</span>
          <h1 className="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Find your ground
          </h1>
          <p className="max-w-xl text-emerald-100/60">
            LOC connects local cricket grounds with the players and teams who play on them — live scoring, canteen
            ordering, bookings, and more, all in one place. Start by searching for your city.
          </p>
        </ScrollReveal>

        {/* Grounds already registered on LOC — shown immediately, no search required. */}
        <RegisteredGrounds />

        {/* Platform-wide highlights, not any one ground's facilities */}
        <ScrollReveal variant={staggerContainer(0.12)} amount={0.4} className="flex flex-wrap justify-center gap-6">
          {STATS.map((stat) => (
            <StatCounter key={stat.label} stat={stat} />
          ))}
        </ScrollReveal>

        {/* City search */}
        <div id="discovery" className="flex w-full scroll-mt-24 flex-col items-center gap-6">
          <CitySearch searched={searched} city={city} onSearch={search} onChangeCity={reset} />
        </div>

        {/* Results */}
        {searched && (
          <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading && Array.from({ length: 6 }).map((_, i) => <GroundCardSkeleton key={i} />)}
            {!loading && !error && grounds.map((ground) => <GroundCard key={ground.publicGroundId} ground={ground} />)}
          </div>
        )}

        {searched && !loading && error && <ErrorState message={error} onRetry={retry} />}
        {searched && !loading && !error && grounds.length === 0 && <EmptyState />}

        {searched && !loading && !error && hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-emerald-400/20 px-6 py-2.5 text-sm font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        )}
      </main>

      <footer className="relative border-t border-emerald-400/10 bg-loc-dark/60 px-6 py-10 text-center lg:px-10">
        <img
          src={logo}
          alt="LOC - Lord Of Cricket"
          className="mx-auto h-14 w-auto"
          style={{ filter: 'drop-shadow(0 0 1.2px rgba(243,241,231,0.9)) drop-shadow(0 0 1.2px rgba(243,241,231,0.9))' }}
        />
        <p className="mt-6 text-xs text-emerald-100/40">© {new Date().getFullYear()} LOC — Lord Of Cricket. All rights reserved.</p>
      </footer>
    </div>
  )
}
