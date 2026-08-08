import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import logo from '../../assets/logo.png'
import Navbar from '../../components/home/Navbar.jsx'
import Hero from '../../components/home/Hero.jsx'
import ImageSlider from '../../components/common/ImageSlider.jsx'
import MatchActivitySection from '../../components/homepage/MatchActivitySection.jsx'
import AmenitiesGrid from '../../components/common/AmenitiesGrid.jsx'
import PartnersGrid from '../../components/common/PartnersGrid.jsx'
import BookingModal from '../../components/booking/BookingModal.jsx'
import PublicAvailabilityPreview from '../../components/booking/PublicAvailabilityPreview.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import { useHomePage } from '../../hooks/useHomePage.js'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import StatCounter from '../../components/homepage/StatCounter.jsx'
import {
  atmosphereReveal,
  fadeUpSoft,
  mapReveal,
  settleFade,
  spotlightReveal,
  staggerContainer,
} from '../../lib/revealVariants.js'

// Phase 5 — headings get their own (soft, quick) reveal, separate from
// whatever content sits below them, so the two never move in lockstep.
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

export default function HomePage() {
  const { stats, groundAddress, currentYear } = useHomePage()
  const [bookingOpen, setBookingOpen] = useState(false)

  return (
    <div id="home" className="relative min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />

        <Navbar />
        <Hero />
      </MouseParallaxProvider>

      <div className="relative flex flex-col items-center gap-16 pb-16">
        {/* Full gallery — the hero above shows a compact rotating preview of
            these same ground photos; this is the expanded view its "View
            Gallery" link scrolls to. India's score now lives in the hero,
            so this row is gallery-only (no more duplicate India card). */}
        <ScrollReveal
          as="div"
          variant={atmosphereReveal}
          amount={0.2}
          id="gallery"
          className="w-full scroll-mt-24 px-6 lg:px-10"
        >
          <div className="h-64 w-full sm:h-80 md:h-112 lg:h-128">
            <ImageSlider />
          </div>
        </ScrollReveal>

        {/* LOC match discovery: featured live match, upcoming fixtures, recent results */}
        <div id="matches" className="w-full scroll-mt-24">
          <MatchActivitySection />
        </div>

        {/* Amenities */}
        <div className="flex w-full flex-col items-center gap-10 px-6 py-6">
          <SectionHeading
            eyebrow="Facilities"
            title="Amenities"
            subtitle="Everything you need for a comfortable, hassle-free day at the ground."
          />
          <AmenitiesGrid />
        </div>

        {/* About */}
        <div id="about" className="flex w-full scroll-mt-24 flex-col items-center gap-10 px-6 py-6">
          <SectionHeading eyebrow="Est. 2011" title="About the Ground" />

          <div className="grid w-full gap-6 lg:grid-cols-3">
            <ScrollReveal
              variant={fadeUpSoft}
              amount={0.4}
              className="flex flex-col justify-center rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent p-6 shadow-lg shadow-black/20"
            >
              <p className="text-emerald-100/70">
                LOC has been the home ground for local cricket for over a decade — from weekend
                nets to league finals. A well-kept outfield, true-bouncing pitches, and a
                welcoming pavilion make it the ground players come back to.
              </p>
            </ScrollReveal>

            <ScrollReveal
              variant={staggerContainer(0.12)}
              amount={0.4}
              className="flex flex-wrap content-center justify-center gap-6"
            >
              {stats.map((stat) => (
                <StatCounter key={stat.label} stat={stat} />
              ))}
            </ScrollReveal>

            <ScrollReveal
              variant={mapReveal}
              amount={0.3}
              className="min-h-64 overflow-hidden rounded-2xl border border-emerald-400/15 shadow-lg shadow-black/20"
            >
              <iframe
                title="Ground location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(groundAddress)}&output=embed`}
                className="h-full min-h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </ScrollReveal>
          </div>
        </div>

        {/* Partners */}
        <div className="flex w-full flex-col items-center gap-10 px-6 py-6">
          <SectionHeading
            eyebrow="Our Network"
            title="Our Dealing Partners"
            subtitle="Trusted brands and businesses we work with to bring the best experience to the ground."
          />
          <PartnersGrid />
        </div>


        {/* Booking — the homepage's primary CTA, so it gets the strongest
            single entrance (spotlightReveal) plus a soft decorative glow
            behind the card that fades in with it. Not a new lighting
            layer — just one low-opacity radial, scoped to this section. */}
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
              Book Our Cricket Ground
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

      {/* Footer — the atmosphere gently settles: fade only, no rise. */}
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

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-emerald-100/60">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              {groundAddress}
            </span>
            <a
              href="mailto:booking@loc-ground.com"
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4 text-emerald-400" />
              booking@loc-ground.com
            </a>
            <a href="tel:+910000000000" className="flex items-center gap-2 transition-colors hover:text-white">
              <Phone className="h-4 w-4 text-emerald-400" />
              +91 00000 00000
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-emerald-100/40">
          © {currentYear} LOC — Lord of Cricket Ground. All rights reserved.
        </p>
      </ScrollReveal>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  )
}
