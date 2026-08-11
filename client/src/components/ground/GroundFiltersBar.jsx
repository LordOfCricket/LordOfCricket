import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

// A popover, not permanent chrome — "clean filtering controls... use a
// filter drawer/popover so the interface remains premium and uncluttered."
// Facilities checkboxes are built from the UNION of real `amenities` names
// actually present across the current result set — never a hardcoded
// facility list, since the schema has no canonical facility enum.
//
// No Sort control here (deliberate, not an oversight): nearby results are
// already server-sorted nearest-first and city results are already
// server-sorted alphabetically — there's no second real ordering to offer
// for either mode today (no rating/price/popularity data exists), so a
// "Sort" dropdown would just present one option that's already the
// default. Revisit once a second real orderable field exists.
export default function GroundFiltersBar({ grounds, selectedFacilities, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const allFacilities = [...new Set(grounds.flatMap((g) => g.amenities || []))].sort()

  if (allFacilities.length === 0) return null

  const toggle = (facility) => {
    onChange(selectedFacilities.includes(facility) ? selectedFacilities.filter((f) => f !== facility) : [...selectedFacilities, facility])
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          selectedFacilities.length > 0 ? 'border-emerald-400/50 bg-emerald-500/10 text-white' : 'border-emerald-400/20 text-emerald-100/70 hover:text-white'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Facilities
        {selectedFacilities.length > 0 && <span className="rounded-full bg-emerald-500 px-1.5 text-xs text-emerald-950">{selectedFacilities.length}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-emerald-400/20 bg-loc-dark p-3 shadow-xl shadow-black/40">
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {allFacilities.map((facility) => (
              <label key={facility} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-emerald-100/80 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={selectedFacilities.includes(facility)}
                  onChange={() => toggle(facility)}
                  className="h-4 w-4 rounded border-emerald-400/40 bg-transparent text-emerald-500 focus:ring-emerald-400/60"
                />
                {facility}
              </label>
            ))}
          </div>
          {selectedFacilities.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-emerald-400 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
