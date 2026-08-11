import { useState } from 'react'
import { Search } from 'lucide-react'

// Phase 13 (post-report revision) — location is city-based, not GPS/lat-lng.
// No browser geolocation, no coordinates, no third-party geocoding service —
// just a plain text search against the `city` column every ground already
// has (server/src/models/ground.model.js's findActiveGroundsByCity).
export default function CitySearch({ searched, city, onSearch, onChangeCity }) {
  const [value, setValue] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!value.trim()) return
    onSearch(value)
  }

  if (searched) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-100/70">
        <span>
          Showing grounds in <span className="font-semibold text-white">{city}</span>
        </span>
        <button type="button" onClick={onChangeCity} className="font-semibold text-emerald-400 underline-offset-2 hover:underline">
          Search a different city
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2">
      <label htmlFor="city-search" className="sr-only">
        City
      </label>
      <input
        id="city-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by city — e.g. Gurugram"
        className="h-12 w-full rounded-full border border-emerald-400/20 bg-white/5 px-5 text-white placeholder:text-emerald-100/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label="Search"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 text-emerald-950 shadow-lg shadow-emerald-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-emerald-400/50 disabled:pointer-events-none disabled:opacity-40"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  )
}
