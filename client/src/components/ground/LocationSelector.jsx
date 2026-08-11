import { LocateFixed, MapPin } from 'lucide-react'
import CitySelector from './CitySelector.jsx'
import RadiusFilter from './RadiusFilter.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import { DEFAULT_RADIUS_KM } from '../../models/groundDiscovery.model.js'

// "SELECT YOUR CITY ... or 📍 FIND GROUNDS NEAR ME" — city search is
// primary/default; geolocation is a secondary action, only requested on
// explicit click (never on mount). Once geolocation succeeds, a radius
// selector appears and every radius change re-runs the nearby search.
export default function LocationSelector({ searched, mode, city, radiusKm, onSearchCity, onSearchNearby, onChangeLocation }) {
  const geo = useGeolocation()

  // Fires the first nearby search directly from the geolocation success
  // callback (see useGeolocation.js's `onSuccess`) — no effect watching
  // status/coords needed.
  const handleFindNearMe = () => {
    geo.requestLocation((coords) => onSearchNearby(coords.latitude, coords.longitude, radiusKm ?? DEFAULT_RADIUS_KM))
  }

  const handleChangeLocation = () => {
    geo.reset()
    onChangeLocation()
  }

  if (searched) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-emerald-100/70">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          {mode === 'nearby' ? 'Showing grounds near you' : (
            <>
              Showing grounds in <span className="font-semibold text-white uppercase">{city}</span>
            </>
          )}
        </span>
        {mode === 'nearby' && <RadiusFilter radiusKm={radiusKm ?? DEFAULT_RADIUS_KM} onChange={(km) => onSearchNearby(geo.coords.latitude, geo.coords.longitude, km)} />}
        <button type="button" onClick={handleChangeLocation} className="font-semibold text-emerald-400 underline-offset-2 hover:underline">
          Change location
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Select Your City</span>
      <CitySelector onSelect={onSearchCity} />

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-emerald-100/40">
        <span className="h-px w-10 bg-emerald-400/20" />
        or
        <span className="h-px w-10 bg-emerald-400/20" />
      </div>

      <button
        type="button"
        onClick={handleFindNearMe}
        disabled={geo.status === 'prompting'}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 px-6 py-3 text-sm font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-60"
      >
        <LocateFixed className="h-4 w-4" aria-hidden="true" />
        {geo.status === 'prompting' ? 'Requesting your location…' : 'Find Grounds Near Me'}
      </button>

      {(geo.status === 'denied' || geo.status === 'unavailable') && (
        <p className="text-sm text-amber-300/80" role="status">
          {geo.status === 'denied'
            ? 'Location access was denied — search by city above instead.'
            : geo.error || "Location isn't available on this device — search by city above instead."}
        </p>
      )}
    </div>
  )
}
