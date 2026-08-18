import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/logo.png'
import Navbar from '../../components/home/Navbar.jsx'
import Hero from '../../components/home/Hero.jsx'
import MatchActivitySection from '../../components/homepage/MatchActivitySection.jsx'
import AmenitiesGrid from '../../components/common/AmenitiesGrid.jsx'
import AmenityCatalogGrid from '../../components/common/AmenityCatalogGrid.jsx'
import PartnersGrid from '../../components/common/PartnersGrid.jsx'
import BookingModal from '../../components/booking/BookingModal.jsx'
import PublicAvailabilityPreview from '../../components/booking/PublicAvailabilityPreview.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import GroundAbout from '../../components/ground/GroundAbout.jsx'
import GroundContact from '../../components/ground/GroundContact.jsx'
import GroundNotFound from '../../components/ground/GroundNotFound.jsx'
import GalleryModal from '../../components/ground/GalleryModal.jsx'
import BackButton from '../../components/common/BackButton.jsx'
import { useGround } from '../../hooks/useGround.js'
import {
  fadeUpSoft,
  settleFade,
  spotlightReveal,
} from '../../lib/revealVariants.js'

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex flex-col items-center gap-3 text-center">
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
          {eyebrow}
        </span>
      )}
      <h2 className="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
        {title}
      </h2>
      <span className="h-1 w-16 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600" />
      {subtitle && <p className="max-w-2xl text-emerald-100/60">{subtitle}</p>}
    </ScrollReveal>
  )
}

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-loc-dark" role="status" aria-label="Loading ground">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  )
}

function PageError({ message, onRetry }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-loc-dark px-6 text-center">
      <p className="text-red-300/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
      >
        Retry
      </button>
    </div>
  )
}

// Level 2: the reusable per-ground template (Step 17). Every
// section reads from `ground` (GET /api/grounds/:publicGroundId);
// nothing here is specific to any one ground's id/name — a second ground
// renders through this exact same component (see the
// two-fixture verification). The URL's :publicGroundId is the ONLY tenancy
// signal (Step 28) — no global "current ground" state exists anywhere.
export default function GroundHomePage() {
  const { publicGroundId } = useParams()
  const { ground, loading, error, notFound, retry } = useGround(publicGroundId)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  useEffect(() => {
    document.title = ground ? `${ground.name} — LOC` : 'Lord Of Cricket'
  }, [ground])

  if (loading) return <PageLoading />
  if (notFound) return <GroundNotFound />
  if (error) return <PageError message={error} onRetry={retry} />
  if (!ground) return null

  const currentYear = new Date().getFullYear()
  // Canteen nav visibility is driven by the ground's amenities list, not
  // the canteens table directly — a ground only gets a "Canteen" nav link
  // once staff have actually listed "Canteen" as one of its amenities.
  // Ground Registration feature — also checks the new catalog-based
  // amenityCatalog (key === 'canteen'), so a ground registered through the
  // new flow gets the same nav behavior as one set up via the legacy
  // owner-uploaded-photo amenities panel.
  const hasCanteenAmenity =
    ground.amenities?.some((a) => a.name.trim().toLowerCase() === 'canteen') || ground.amenityCatalog?.some((a) => a.key === 'canteen')

  return (
    <div id="home" className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />

        <Navbar onOpenGallery={() => setGalleryOpen(true)} canteenHref={hasCanteenAmenity ? '/canteen/menu' : null} />
        <Hero ground={ground} onViewGallery={() => setGalleryOpen(true)} />
      </MouseParallaxProvider>

      <div className="relative flex flex-col items-center gap-16 pb-16">
        <div className="w-full px-6 pt-6">
          <BackButton label="Back to Grounds" fallback="/grounds" />
        </div>

        {/* LOC match discovery: featured live match, upcoming fixtures, recent results */}
        <div id="matches" className="w-full scroll-mt-24">
          <MatchActivitySection />
        </div>

        {/* Amenities */}
        <div id="amenities" className="flex w-full scroll-mt-24 flex-col items-center gap-10 px-6 py-6">
          <SectionHeading
            eyebrow="Facilities"
            title="Amenities"
            subtitle="Everything you need for a comfortable, hassle-free day at the ground."
          />
          <AmenityCatalogGrid amenities={ground.amenityCatalog} />
          {/* Legacy owner-uploaded-photo amenities — skips its own "no
              amenities" message when the new catalog above already has
              entries, so a ground set up entirely through the new flow
              doesn't show a redundant empty-state right below real content. */}
          {(ground.amenities?.length > 0 || !ground.amenityCatalog?.length) && <AmenitiesGrid amenities={ground.amenities} />}
        </div>

        {/* About */}
        <div id="about" className="flex w-full scroll-mt-24 flex-col items-center gap-10 px-6 py-6">
          <SectionHeading eyebrow={ground.name} title="About This Ground" />
          <GroundAbout ground={ground} />
        </div>

        {/* Partners — platform-wide, not ground-specific (partners have never
            been scoped to a ground; unchanged here). */}
        <div className="flex w-full flex-col items-center gap-10 px-6 py-6">
          <SectionHeading
            eyebrow="Our Network"
            title="Our Dealing Partners"
            subtitle="Trusted brands and businesses we work with to bring the best experience to the ground."
          />
          <PartnersGrid />
        </div>

        {/* Booking — the ground's booking system isn't ground-scoped on the
            backend yet (out of scope), so
            this stays exactly as it was: a single, global booking flow. */}
        <div id="booking" className="relative w-full scroll-mt-24 px-6 py-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div
              className="h-72 w-full max-w-2xl rounded-full opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, color-mix(in srgb, var(--color-loc-gold) 20%, transparent), transparent 70%)' }}
            />
          </div>
          <ScrollReveal
            variant={spotlightReveal}
            amount={0.35}
            className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-emerald-400/20 bg-linear-to-b from-emerald-400/10 to-transparent px-8 py-12 text-center shadow-2xl shadow-black/30 backdrop-blur-sm"
          >
            <h2 className="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              Book {ground.name}
            </h2>
            <span className="h-1 w-16 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600" />
            <p className="max-w-xl text-emerald-100/60">
              Check live availability and reserve a pitch, nets, or the full ground for your next match.
            </p>
            <PublicAvailabilityPreview />
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="mt-2 inline-flex items-center rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-7 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-emerald-400/50"
            >
              Book Ground
            </button>
          </ScrollReveal>
        </div>
      </div>

      {/* Footer */}
      <ScrollReveal
        as="footer"
        variant={settleFade}
        amount={0.15}
        className="relative border-t border-emerald-400/10 bg-loc-dark/60 px-6 py-10 lg:px-10"
      >
        <div className="flex w-full flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="flex items-center">
            <img
              src={logo}
              alt="LOC - Lord Of Cricket"
              className="h-16 w-auto"
              style={{ filter: 'drop-shadow(0 0 1.2px rgba(243,241,231,0.9)) drop-shadow(0 0 1.2px rgba(243,241,231,0.9))' }}
            />
          </div>

          <GroundContact ground={ground} />
        </div>

        <p className="mt-8 text-center text-xs text-emerald-100/40">
          © {currentYear} {ground.name} — Powered by LOC. All rights reserved.
        </p>
      </ScrollReveal>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      <GalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} photos={ground.photos} groundName={ground.name} />
    </div>
  )
}
