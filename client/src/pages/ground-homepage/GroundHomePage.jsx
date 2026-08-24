import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useSeoMeta } from '../../hooks/useSeoMeta.js'
import { useJsonLd } from '../../hooks/useJsonLd.js'
import logo from '../../assets/logo.png'
import Navbar from '../../components/home/Navbar.jsx'
import Hero from '../../components/home/Hero.jsx'
import MatchActivitySection from '../../components/homepage/MatchActivitySection.jsx'
import AmenityCatalogGrid from '../../components/common/AmenityCatalogGrid.jsx'
import BookingModal from '../../components/booking/BookingModal.jsx'
import PublicAvailabilityPreview from '../../components/booking/PublicAvailabilityPreview.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import GroundAbout from '../../components/ground/GroundAbout.jsx'
import LocationMap from '../../components/ground/LocationMap.jsx'
import GroundNotFound from '../../components/ground/GroundNotFound.jsx'
import GalleryModal from '../../components/ground/GalleryModal.jsx'
import UpcomingFixtures from '../../components/homepage/UpcomingFixtures.jsx'
import RecentResults from '../../components/homepage/RecentResults.jsx'
import { useGround } from '../../hooks/useGround.js'
import {
  fadeUpSoft,
  settleFade,
  spotlightReveal,
} from '../../lib/revealVariants.js'

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07110E]" role="status" aria-label="Loading ground">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  )
}

function PageError({ message, onRetry }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07110E] px-6 text-center">
      <p className="text-red-300/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-[#064B38] px-6 py-2.5 font-semibold text-[#F5F7F5] transition hover:bg-[#0a5f47]"
      >
        Retry
      </button>
    </div>
  )
}

export default function GroundHomePage() {
  const { publicGroundId } = useParams()
  const { ground, loading, error, notFound, retry } = useGround(publicGroundId)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const heroPhoto = ground?.photos?.find((p) => p.isFeatured) || ground?.photos?.[0]
  const location = ground ? [ground.city, ground.state].filter(Boolean).join(', ') : ''
  useSeoMeta({
    title: ground ? `${ground.name}${location ? ` — ${location}` : ''} | Lord Of Cricket` : 'Lord Of Cricket',
    description: ground
      ? (ground.description?.trim() || `Book ${ground.name}${location ? ` in ${location}` : ''} on Lord Of Cricket — view photos, amenities, and availability.`).slice(0, 300)
      : undefined,
    canonical: ground ? `${window.location.origin}/grounds/${ground.publicGroundId}` : undefined,
    ogImage: heroPhoto?.imageUrl,
  })

  // Phase 12 — SportsActivityLocation + BreadcrumbList, built only from
  // fields the ground profile API actually returned for THIS ground; a
  // field is omitted from the schema entirely rather than filled with a
  // placeholder when the ground doesn't have it (no fabricated address/
  // phone/rating/review data). Phase 13 — aggregateRating now included, but
  // ONLY when ratingCount > 0: a ground with zero reviews has no rating to
  // honestly report, so the field is omitted entirely rather than a fake
  // "0 stars" (same honest-absence convention as the visible rating badge
  // above and Google's own guidance against a zero/placeholder aggregateRating).
  useJsonLd(
    ground && {
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name: ground.name,
      ...(ground.description ? { description: ground.description } : {}),
      url: `${window.location.origin}/grounds/${ground.publicGroundId}`,
      ...(heroPhoto?.imageUrl ? { image: heroPhoto.imageUrl } : {}),
      ...(ground.phone ? { telephone: ground.phone } : {}),
      ...(ground.addressLine || ground.city
        ? {
            address: {
              '@type': 'PostalAddress',
              ...(ground.addressLine ? { streetAddress: ground.addressLine } : {}),
              ...(ground.city ? { addressLocality: ground.city } : {}),
              ...(ground.state ? { addressRegion: ground.state } : {}),
              ...(ground.postalCode ? { postalCode: ground.postalCode } : {}),
              ...(ground.country ? { addressCountry: ground.country } : {}),
            },
          }
        : {}),
      ...(ground.latitude != null && ground.longitude != null
        ? { geo: { '@type': 'GeoCoordinates', latitude: ground.latitude, longitude: ground.longitude } }
        : {}),
      ...(ground.ratingCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: ground.ratingAvg,
              reviewCount: ground.ratingCount,
            },
          }
        : {}),
    },
  )
  useJsonLd(
    ground && {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
        { '@type': 'ListItem', position: 2, name: 'Grounds', item: `${window.location.origin}/grounds` },
        { '@type': 'ListItem', position: 3, name: ground.name, item: `${window.location.origin}/grounds/${ground.publicGroundId}` },
      ],
    },
  )

  if (loading) return <PageLoading />
  if (notFound) return <GroundNotFound />
  if (error) return <PageError message={error} onRetry={retry} />
  if (!ground) return null

  const currentYear = new Date().getFullYear()

  return (
    <div id="home" className="relative isolate overflow-x-hidden bg-[#07110E]">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />

        <Navbar />
        <Hero ground={ground} onViewGallery={() => setGalleryOpen(true)} onBook={() => setBookingOpen(true)} />
      </MouseParallaxProvider>

      {/* ABOUT THE GROUND — DARK SECTION */}
      <section className="relative w-full bg-[#07110E] px-6 py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#064B38]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal variant={fadeUpSoft} amount={0.3} className="flex flex-col items-center gap-0 text-center mb-12">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] letter-spacing-wide">The Story</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#F5F7F5] mb-6 leading-tight drop-shadow-lg">
              About <span className="bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#F5D547] bg-clip-text text-transparent">{ground.name}</span>
            </h2>
            {/* Phase 13 — real ground.ratingAvg/ratingCount (grounds table,
                recomputed from match_feedback); "No reviews yet" for a
                ground with none, never a fabricated number. */}
            <p className="mb-6 flex items-center gap-2 text-sm font-semibold">
              {ground.ratingAvg !== null && ground.ratingAvg !== undefined ? (
                <>
                  <Star className="h-4 w-4 shrink-0 fill-[#D4AF37] text-[#D4AF37]" aria-hidden="true" />
                  <span className="text-[#F5F7F5]">{ground.ratingAvg.toFixed(1)}</span>
                  <span className="text-[#F5F7F5]/50">
                    ({ground.ratingCount} {ground.ratingCount === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              ) : (
                <span className="text-[#F5F7F5]/50">No reviews yet</span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-[#D4AF37]" />
              <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#064B38]" />
              <div className="h-1.5 w-8 rounded-full bg-[#064B38]" />
            </div>
          </ScrollReveal>
          <div className="flex justify-center">
            <GroundAbout ground={ground} />
          </div>
        </div>
      </section>

      {/* CANTEEN — DARK SECTION (customer entry point — only rendered when
          this ground actually has a canteen; see
          CUSTOMER_CANTEEN_MIGRATION_INSPECTION.md) */}
      {ground.canteens?.length > 0 && (
        <section className="relative w-full bg-[#07110E] px-6 py-12 lg:py-16 overflow-hidden">
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Refreshments</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
            </div>
            <h2 className="mb-3 text-4xl font-black text-[#F5F7F5] sm:text-5xl">Canteen</h2>
            <p className="mb-8 text-lg text-[#B5C2BC]">Order food and refreshments for pickup at the ground</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {ground.canteens.map((canteen) =>
                canteen.isActive ? (
                  <Link
                    key={canteen.publicCanteenId}
                    to={`/grounds/${ground.publicGroundId}/canteen/${canteen.publicCanteenId}/menu`}
                    className="rounded-full bg-gradient-to-r from-[#064B38] to-[#0a5f47] px-8 py-3 text-sm font-bold uppercase tracking-wide text-[#F5F7F5] shadow-lg shadow-[#D4AF37]/30 transition-all duration-300 hover:scale-105 hover:shadow-[#D4AF37]/50"
                  >
                    {ground.canteens.length > 1 ? `Order from ${canteen.name}` : 'Order Food'}
                  </Link>
                ) : (
                  <span
                    key={canteen.publicCanteenId}
                    className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-[#7E8C86]"
                  >
                    {canteen.name} — Currently closed
                  </span>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* AMENITIES MARQUEE — GREEN SECTION */}
      <section className="relative w-full bg-gradient-to-b from-[#064B38] to-[#063A2D] py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Heading - Constrained */}
        <div className="relative px-6 mb-10">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal variant={fadeUpSoft} amount={0.3} className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-4xl sm:text-5xl font-bold text-[#F5F7F5]">
                Amenities
              </h2>
              <p className="text-[#B5C2BC] max-w-2xl text-lg">Everything you need for a perfect day at the ground</p>
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-[#D4AF37]" />
                <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#064B38]" />
                <div className="h-1 w-8 rounded-full bg-[#064B38]" />
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Amenities — icon + name cards, dynamically loaded from the
            ground's own catalog selections (falls back to the legacy
            owner-uploaded-photo list only if it has no catalog entries). */}
        <div className="relative flex justify-center px-6">
          {ground.amenityCatalog?.length > 0 || ground.amenities?.length > 0 ? (
            <AmenityCatalogGrid amenities={ground.amenityCatalog?.length > 0 ? ground.amenityCatalog : ground.amenities} />
          ) : (
            <p className="text-[#B5C2BC]">No amenities added yet</p>
          )}
        </div>
      </section>

      {/* UPCOMING MATCHES — DARK SECTION */}
      <section className="relative w-full bg-[#07110E] px-6 py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#064B38]/20 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div id="matches" className="w-full mb-16">
            <MatchActivitySection />
          </div>

          <ScrollReveal variant={fadeUpSoft} amount={0.3} className="flex flex-col items-center gap-3 text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#F5F7F5]">
              Upcoming Matches
            </h2>
            <p className="text-[#B5C2BC] max-w-2xl text-lg">Fixtures scheduled for today and tomorrow</p>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-[#D4AF37]" />
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#064B38]" />
              <div className="h-1 w-8 rounded-full bg-[#064B38]" />
            </div>
          </ScrollReveal>

          {/* Upcoming Fixtures */}
          <div className="w-full">
            <UpcomingFixtures groundId={ground.id} />
          </div>
        </div>
      </section>

      {/* RECENT RESULTS — GREEN SECTION */}
      <section className="relative w-full bg-gradient-to-b from-[#064B38] to-[#063A2D] px-6 py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal variant={fadeUpSoft} amount={0.3} className="flex flex-col items-center gap-3 text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#F5F7F5]">
              Recent Results
            </h2>
            <p className="text-[#B5C2BC] max-w-2xl text-lg">Past matches and final scores</p>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-[#D4AF37]" />
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#064B38]" />
              <div className="h-1 w-8 rounded-full bg-[#064B38]" />
            </div>
          </ScrollReveal>

          <div className="w-full">
            <RecentResults groundId={ground.id} />
          </div>
        </div>
      </section>

      {/* BOOKING + LOCATION — DARK SECTION */}
      <section id="booking" className="relative w-full bg-[#07110E] px-6 py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#064B38]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 h-auto lg:h-fit">
            {/* LEFT: BOOKING */}
            <div className="flex flex-col justify-start lg:pr-6 pb-8 lg:pb-0">
              <ScrollReveal variant={spotlightReveal} amount={0.3} className="space-y-6 h-full flex flex-col">
                <div className="space-y-3">
                  <h2 className="text-4xl sm:text-5xl font-bold text-[#F5F7F5]">
                    Check Availability & Book
                  </h2>
                  <p className="text-[#B5C2BC] text-lg">
                    Reserve your pitch, nets, or the entire ground for your next match
                  </p>
                </div>

                <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#101B17] to-[#0a1410] p-5 space-y-3 shadow-lg shadow-[#064B38]/20 flex flex-col">
                  <PublicAvailabilityPreview />
                  <button
                    type="button"
                    onClick={() => setBookingOpen(true)}
                    className="w-full rounded-full bg-gradient-to-r from-[#064B38] to-[#0a5f47] px-6 py-2.5 text-sm font-bold text-[#F5F7F5] uppercase tracking-wide shadow-lg shadow-[#D4AF37]/30 transition-all duration-300 hover:shadow-[#D4AF37]/50 hover:scale-105 active:scale-95"
                  >
                    Book {ground.name}
                  </button>
                </div>
              </ScrollReveal>
            </div>

            {/* VERTICAL SEPARATOR */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/40 to-transparent transform -translate-x-1/2" />

            {/* RIGHT: LOCATION */}
            <div className="flex flex-col justify-start lg:pl-6">
              <ScrollReveal variant={spotlightReveal} amount={0.3} className="space-y-6 h-full flex flex-col">
                <div className="space-y-3">
                  <h2 className="text-4xl sm:text-5xl font-bold text-[#F5F7F5]">
                    Location
                  </h2>
                  <p className="text-[#B5C2BC] text-lg">
                    Find us and get directions
                  </p>
                </div>

                <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#101B17] to-[#0a1410] p-5 shadow-lg shadow-[#064B38]/20 flex-1 flex flex-col">
                  <LocationMap ground={ground} />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative w-full border-t border-[#D4AF37]/20 bg-gradient-to-b from-[#07110E] to-[#05090A] px-6 py-8 lg:px-10 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#064B38]/20 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal
            variant={settleFade}
            amount={0.15}
            className="flex w-full items-center justify-between gap-8"
          >
            <div className="flex items-center">
              <img
                src={logo}
                alt="LOC - Lord Of Cricket"
                className="h-12 w-auto drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 0 2px rgba(212,175,55,0.4)) drop-shadow(0 0 4px rgba(212,175,55,0.2))' }}
              />
            </div>

            <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/40 to-transparent" />

            <div className="text-center sm:text-right space-y-1">
              <p className="text-xs sm:text-sm text-[#B5C2BC] font-medium">
                Experience cricket at {ground.name}
              </p>
              <p className="text-xs text-[#7E8C86]">
                © {currentYear} {ground.name} — Powered by LOC
              </p>
            </div>
          </ScrollReveal>
        </div>
      </footer>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      <GalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} photos={ground.photos} groundName={ground.name} />
    </div>
  )
}
