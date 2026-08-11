import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'

// Phase 13 Step 11/12 — every field here comes from GET /api/grounds/search
// (city-based discovery, post-report revision); nothing is hardcoded
// per-ground. Navigation always uses the API's own publicGroundId, never an
// array index or numeric id (Step 12).
export default function GroundCard({ ground }) {
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
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-lg font-semibold text-white">{ground.name}</h3>
        {(ground.city || ground.state) && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-100/60">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            {[ground.city, ground.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </Link>
  )
}
