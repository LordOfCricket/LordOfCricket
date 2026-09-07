import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSeoMeta } from '../../hooks/useSeoMeta.js'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import SiteFooter from '../../components/home/SiteFooter.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import { getMerchandiseItem } from '../../services/merchandise.js'
import { formatPrice } from '../../lib/money.js'

const STATUS_LABEL = {
  ACTIVE: { label: 'In Stock', className: 'bg-emerald-500/15 text-emerald-300' },
  OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-white/10 text-emerald-100/50' },
}

// Read-only product detail — the per-card CTA target. Shows image, name,
// description, price and stock status. No cart / checkout / add-to-bag:
// that's future e-commerce scope, deliberately not built here.
export default function MerchandiseDetailPage() {
  const { id } = useParams()
  // One state object keyed by the id it was loaded for — lets an id change
  // read as "loading" without a synchronous setState inside the effect.
  const [entry, setEntry] = useState({ id: null, product: null, error: null })

  useEffect(() => {
    let cancelled = false
    getMerchandiseItem(id)
      .then((data) => {
        if (!cancelled) setEntry({ id, product: data, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry({ id, product: null, error: err.response?.status === 404 ? 'This product is no longer available.' : "Couldn't load this product." })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const ready = entry.id === id
  const product = ready ? entry.product : null
  const error = ready ? entry.error : null

  useSeoMeta({
    title: product ? `${product.name} — LOC Merchandise` : 'LOC Merchandise',
    description: product?.description || 'Official Lord Of Cricket merchandise.',
    canonical: `${window.location.origin}/merchandise/${id}`,
  })

  const loading = !product && !error
  const status = product ? STATUS_LABEL[product.status] : null
  const original = product?.onSale ? formatPrice(product.originalPrice) : null

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pt-28 pb-20 lg:px-10">
        <Link to="/merchandise" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-100/60 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Merchandise
        </Link>

        {error ? (
          <p className="text-red-300/80">{error}</p>
        ) : loading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl border border-emerald-400/10 bg-white/5" />
            <div className="flex flex-col gap-4">
              <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/5" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/5" />
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-emerald-400/15 bg-black/40">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-linear-to-br from-emerald-900/40 to-loc-dark">
                  <span className="font-loc-display text-7xl font-bold text-emerald-400/30">{product.name?.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {product.category && <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">{product.category}</span>}
              <h1 className="font-loc-display text-3xl font-extrabold tracking-[0.03em] text-white uppercase sm:text-4xl">{product.name}</h1>

              <div className="flex items-baseline gap-3">
                <span className="font-loc-display text-3xl font-extrabold text-emerald-400">{formatPrice(product.sellingPrice)}</span>
                {original && <span className="text-lg text-emerald-100/40 line-through">{original}</span>}
              </div>

              {status && (
                <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase ${status.className}`}>
                  {status.label}
                </span>
              )}

              {product.description && <p className="leading-relaxed text-emerald-100/70">{product.description}</p>}

              <p className="mt-2 rounded-2xl border border-emerald-400/15 bg-white/2 px-4 py-3 text-sm text-emerald-100/50">
                Online ordering is coming soon. For purchase enquiries, contact the LOC team.
              </p>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
