import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { formatPrice } from '../../lib/money.js'

// Shared product card — the homepage MerchandiseSection and the /merchandise
// catalog page render the same card so they stay visually identical.
// Pure presentation from the public API shape (services/merchandise.js);
// no cart / checkout — the CTA is a link to the read-only detail page.

const STATUS_BADGE = {
  OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-white/10 text-emerald-100/50' },
}

export default function MerchandiseCard({ product }) {
  const badge = STATUS_BADGE[product.status]
  const selling = formatPrice(product.sellingPrice)
  const original = product.onSale ? formatPrice(product.originalPrice) : null

  return (
    <Link
      to={`/merchandise/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-400/15 bg-loc-card-dark shadow-xl shadow-black/40 transition-colors duration-300 hover:border-loc-gold/40"
    >
      <div className="relative h-56 w-full shrink-0 overflow-hidden bg-black/40">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-900/40 to-loc-dark">
            <span className="font-loc-display text-5xl font-bold text-emerald-400/30">{product.name?.charAt(0)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-loc-card-dark via-transparent to-transparent" />
        {badge && (
          <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex-1">
          <h3 className="font-loc-display text-lg font-bold text-white uppercase">{product.name}</h3>
          {product.category && <p className="mt-0.5 text-xs tracking-wide text-emerald-100/50 uppercase">{product.category}</p>}
          {product.description && <p className="mt-2 line-clamp-2 text-sm text-emerald-100/60">{product.description}</p>}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-loc-display text-xl font-extrabold text-emerald-400">{selling}</span>
          {original && <span className="text-sm text-emerald-100/40 line-through">{original}</span>}
        </div>

        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-100/60 transition-colors group-hover:text-white">
          View Product
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}
