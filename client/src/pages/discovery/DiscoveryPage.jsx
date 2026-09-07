import { useSeoMeta } from '../../hooks/useSeoMeta.js'
import { useJsonLd } from '../../hooks/useJsonLd.js'
import Navbar from '../../components/home/Navbar.jsx'
import PlatformHero from '../../components/home/PlatformHero.jsx'
import AboutSection from '../../components/home/AboutSection.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BookGroundSection from '../../components/ground/BookGroundSection.jsx'
import HallOfFameSection from '../../components/home/HallOfFameSection.jsx'
import NextGenerationSection from '../../components/home/NextGenerationSection.jsx'
import MerchandiseSection from '../../components/home/MerchandiseSection.jsx'
import SponsorsSection from '../../components/home/SponsorsSection.jsx'
import FinalCtaSection from '../../components/home/FinalCtaSection.jsx'
import SiteFooter from '../../components/home/SiteFooter.jsx'

// Level 1 — the LOC PLATFORM homepage. Explains LOC and helps a visitor
// find a ground; deliberately does not present LOC itself as one physical
// ground (that's GroundHomePage, Level 2, at /grounds/:publicGroundId).
//
// Full story order: PlatformHero -> About Us -> Book Ground -> Hall of Fame
// -> Next Generation -> Merchandise -> Sponsors -> Final CTA -> Footer. "Find Your Perfect
// Ground" (city/nearby search + results grid), "Featured Grounds",
// "Ecosystem" ("More Than A Ground."), and "Beyond the Scorecard" ("Every
// Run Has A Direction") were all removed from here — ground browsing/
// booking now lives in Book Ground above and on the dedicated /grounds page
// (GroundsPage.jsx). PlatformHero's and FinalCtaSection's "Join LOC" CTAs
// route to /grounds instead of scrolling to a same-page section.
export default function DiscoveryPage() {
  useSeoMeta({
    title: 'Lord Of Cricket — Find & Book Cricket Grounds Near You',
    description: 'Discover and book cricket grounds, organize matches, and connect with the cricket ecosystem on Lord Of Cricket.',
    canonical: `${window.location.origin}/`,
  })
  useJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lord Of Cricket',
    url: window.location.origin,
  })

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
        <PlatformHero />
      </MouseParallaxProvider>

      <main className="relative flex flex-col items-center gap-16 px-6 pt-16 pb-16 lg:px-10">
        <AboutSection />

        <BookGroundSection />

        <HallOfFameSection />

        <NextGenerationSection />

        <MerchandiseSection />
        <SponsorsSection />
      </main>

      <FinalCtaSection />
      <SiteFooter />
    </div>
  )
}
