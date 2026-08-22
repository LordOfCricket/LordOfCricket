import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/logo.png'
import Navbar from '../../components/home/Navbar.jsx'
import Hero from '../../components/home/Hero.jsx'
import MatchActivitySection from '../../components/homepage/MatchActivitySection.jsx'
import AmenityCatalogGrid from '../../components/common/AmenityCatalogGrid.jsx'
import AmenitiesGrid from '../../components/common/AmenitiesGrid.jsx'
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
import AmenitiesMarquee from '../../components/homepage/AmenitiesMarquee.jsx'
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

  useEffect(() => {
    document.title = ground ? `${ground.name} — LOC` : 'Lord Of Cricket'
  }, [ground])

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

        {/* Amenities Marquee - Full Width */}
        <div className="w-full overflow-hidden py-6">
          <AmenitiesMarquee amenities={ground.amenityCatalog?.length > 0 ? ground.amenityCatalog : ground.amenities} />
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
