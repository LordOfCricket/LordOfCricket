import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { formatDistance } from '../../models/groundDiscovery.model.js'

const MAX_VISIBLE_FACILITIES = 3

// Every field here comes straight from GET /api/grounds/search|nearby|
// (city/nearby/browse-all discovery); nothing is hardcoded per-ground.
// Navigation always uses the API's own publicGroundId, never an array
// index or numeric id. No rating/price shown — those fields don't exist in
// the schema, so they're simply absent, not a fake placeholder.
export default function GroundCard({ ground }) {
  const facilities = ground.amenities || []
  const extraCount = Math.max(0, facilities.length - MAX_VISIBLE_FACILITIES)

  return (
    <Link
      to={`/grounds/${ground.publicGroundId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-emerald-500/20"
    >
      <div className="relative h-44 w-full overflow-hidden bg-loc-card-dark">
        {ground.primaryPhoto ? (
          <img
            src={ground.primaryPhoto}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src="/images/cricket-stadium.jpg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-full w-full object-cover opacity-40"
          />
        )}
        {typeof ground.distanceKm === 'number' && (
          <span className="absolute top-3 right-3 rounded-full bg-loc-dark/80 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
            {formatDistance(ground.distanceKm)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{ground.name}</h3>
          {(ground.city || ground.state) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-100/60">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              {[ground.city, ground.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {facilities.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {facilities.slice(0, MAX_VISIBLE_FACILITIES).map((facility) => (
              <span key={facility} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-emerald-100/70">
                {facility}
              </span>
            ))}
            {extraCount > 0 && <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-emerald-100/50">+{extraCount} more</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
