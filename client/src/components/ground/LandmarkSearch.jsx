import { useState } from 'react'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import KmRangeSlider from './KmRangeSlider.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import { geocodeLandmark } from '../../services/geocodeApi.js'

const MAX_QUERY_LENGTH = 150

// Grounds page — "give a landmark, in which around the landmark we will
// list out the grounds." Resolves free text to real coordinates via the
// backend's Nominatim-backed /api/geocode (geocodeLandmark), then hands the
// resolved { latitude, longitude, label } up to the caller, which owns the
// actual ground search. GPS ("📍 Use My Location") is offered as a
// secondary shortcut to the same resolved-coordinates contract — same
// pattern LocationSelector.jsx already uses on the homepage (geolocation
// only requested on explicit click, never on mount).
export default function LandmarkSearch({ radiusKm, onRadiusCommit, onResolved }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const geo = useGeolocation()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const location = await geocodeLandmark(trimmed)
      onResolved({ latitude: location.latitude, longitude: location.longitude, label: location.displayName })
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't find that location.")
    } finally {
      setLoading(false)
    }
  }

  const handleUseMyLocation = () => {
    setError(null)
    geo.requestLocation((coords) => onResolved({ latitude: coords.latitude, longitude: coords.longitude, label: 'your location' }))
  }

  return (
    <div className="flex w-full flex-col items-start gap-5">
      <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Search Near a Landmark</span>

      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 rounded-full border border-emerald-400/20 bg-white/5 px-4">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="e.g. India Gate, Delhi"
          aria-label="Search near a landmark"
          className="h-12 w-full min-w-0 bg-transparent text-white placeholder:text-emerald-100/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          {loading ? '…' : 'Go'}
        </button>
      </form>

      <div className="flex w-full items-center gap-3 text-xs font-semibold uppercase tracking-widest text-emerald-100/40">
        <span className="h-px flex-1 bg-emerald-400/20" />
        or
        <span className="h-px flex-1 bg-emerald-400/20" />
      </div>

      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={geo.status === 'prompting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/20 px-6 py-3 text-sm font-semibold text-emerald-100/80 transition-colors hover:border-emerald-400/50 hover:text-white disabled:opacity-60"
      >
        <LocateFixed className="h-4 w-4" aria-hidden="true" />
        {geo.status === 'prompting' ? 'Requesting your location…' : 'Use My Location'}
      </button>

      <KmRangeSlider value={radiusKm} onCommit={onRadiusCommit} />

      {error && (
        <p className="text-sm text-amber-300/80" role="status">
          {error}
        </p>
      )}
      {(geo.status === 'denied' || geo.status === 'unavailable') && (
        <p className="text-sm text-amber-300/80" role="status">
          {geo.status === 'denied' ? 'Location access was denied — try a landmark search above instead.' : geo.error || "Location isn't available on this device."}
        </p>
      )}
    </div>
  )
}
