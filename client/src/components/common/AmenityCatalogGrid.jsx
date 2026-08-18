import * as icons from 'lucide-react'
import ScrollReveal from './ScrollReveal.jsx'
import { staggerContainer } from '../../lib/revealVariants.js'
import StaggerItem from './StaggerItem.jsx'

// Ground Registration feature — LOC-predefined icon+name amenities (§9/§28),
// resolved from the ground's own `amenityCatalog` (GET /api/grounds/
// :publicGroundId), never an owner-uploaded image. Sibling to, not a
// replacement for, AmenitiesGrid.jsx (the legacy owner-uploaded-photo
// list) — a ground can have either, both, or neither.
export default function AmenityCatalogGrid({ amenities = [] }) {
  if (amenities.length === 0) return null

  return (
    <ScrollReveal variant={staggerContainer(0.05)} amount={0.15} className="grid w-full max-w-2xl grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
      {amenities.map((amenity) => {
        const Icon = icons[amenity.icon]
        return (
          <StaggerItem key={amenity.key}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                {Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : <span className="h-6 w-6" />}
              </div>
              <span className="text-sm font-medium text-emerald-50">{amenity.name}</span>
            </div>
          </StaggerItem>
        )
      })}
    </ScrollReveal>
  )
}
