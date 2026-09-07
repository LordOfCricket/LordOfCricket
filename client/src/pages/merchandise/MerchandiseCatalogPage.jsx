import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSeoMeta } from '../../hooks/useSeoMeta.js'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import SiteFooter from '../../components/home/SiteFooter.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import MerchandiseCard from '../../components/merchandise/MerchandiseCard.jsx'
import { useMerchandise } from '../../hooks/useMerchandise.js'
import { fadeUpSoft } from '../../lib/revealVariants.js'

function CardSkeleton() {
  return <div className="h-96 animate-pulse rounded-3xl border border-emerald-400/10 bg-white/5" />
}

// Read-only catalog — the "Explore Merchandise" destination. Same public
// data and card as the homepage section; no cart / filters / checkout.
export default function MerchandiseCatalogPage() {
  const { products, loading, error } = useMerchandise()

  useSeoMeta({
    title: 'LOC Merchandise — Official Cricket Store',
    description: 'Official Lord Of Cricket merchandise — jerseys, tees, caps and accessories for those who live the game.',
    canonical: `${window.location.origin}/merchandise`,
  })

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pt-28 pb-20 lg:px-10">
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex flex-col gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-100/60 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <span className="text-sm font-semibold tracking-widest text-emerald-400 uppercase">LOC Store</span>
          <h1 className="font-loc-display text-4xl font-extrabold tracking-[0.04em] text-loc-gold uppercase sm:text-5xl">
            Wear the Spirit of Cricket.
          </h1>
          <p className="max-w-xl text-emerald-100/60">Official LOC merchandise for those who live the game.</p>
        </ScrollReveal>

        {error ? (
          <p className="text-red-300/80">{error}</p>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-emerald-400/20 bg-white/2 px-8 py-16 text-center">
            <p className="text-sm text-emerald-100/50">No merchandise available yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <MerchandiseCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
