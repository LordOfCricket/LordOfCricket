import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import logo from '../../assets/logo.png'
import Navbar from '../../components/layout/Navbar.jsx'
import ImageSlider from '../../components/common/ImageSlider.jsx'
import IndiaMatchCard from '../../components/common/IndiaMatchCard.jsx'
import MatchActivitySection from '../../components/homepage/MatchActivitySection.jsx'
import AmenitiesGrid from '../../components/common/AmenitiesGrid.jsx'
import PartnersGrid from '../../components/common/PartnersGrid.jsx'
import BookingModal from '../../components/booking/BookingModal.jsx'
import PublicAvailabilityPreview from '../../components/booking/PublicAvailabilityPreview.jsx'
import { useHomePage } from '../../hooks/useHomePage.js'

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
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
    </div>
  )
}

export default function HomePage() {
  const { stats, groundAddress, currentYear } = useHomePage()
  const [bookingOpen, setBookingOpen] = useState(false)

  return (
    <div id="home" className="relative min-h-screen overflow-x-hidden bg-emerald-950">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative flex flex-col items-center gap-16 pt-28 pb-16">
        {/* Gallery / slider + India live score */}
        <div id="gallery" className="w-full scroll-mt-24 px-6 lg:px-10">
          <div className="flex flex-col gap-6 lg:h-128 lg:flex-row">
            <div className="h-64 w-full sm:h-80 md:h-112 lg:h-full lg:w-2/3">
              <ImageSlider />
            </div>
            <div id="live-score" className="w-full scroll-mt-24 lg:h-full lg:w-1/3">
              <IndiaMatchCard />
            </div>
          </div>
        </div>

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
            <div className="flex flex-col justify-center rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent p-6 shadow-lg shadow-black/20">
              <p className="text-emerald-100/70">
                LOC has been the home ground for local cricket for over a decade — from weekend
                nets to league finals. A well-kept outfield, true-bouncing pitches, and a
                welcoming pavilion make it the ground players come back to.
              </p>
            </div>

            <div className="flex flex-wrap content-center justify-center gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="w-40 rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent px-4 py-6 text-center shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40"
                >
                  <p className="bg-linear-to-r from-emerald-300 to-emerald-500 bg-clip-text text-3xl font-bold text-transparent">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-emerald-100/60">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="min-h-64 overflow-hidden rounded-2xl border border-emerald-400/15 shadow-lg shadow-black/20">
              <iframe
                title="Ground location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(groundAddress)}&output=embed`}
                className="h-full min-h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
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


        {/* Booking */}
        <div id="booking" className="w-full scroll-mt-24 px-6 py-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-emerald-400/20 bg-linear-to-b from-emerald-400/10 to-transparent px-8 py-12 text-center shadow-2xl shadow-black/30 backdrop-blur-sm">
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
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-emerald-400/10 bg-emerald-950/60 px-6 py-10 lg:px-10">
        <div className="flex w-full flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="flex items-center">
            <img src={logo} alt="LOC - Lord Of Cricket" className="h-16 w-auto" />
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
      </footer>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  )
}
