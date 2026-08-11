import ScrollReveal from '../common/ScrollReveal.jsx'
import { fadeUpSoft, mapReveal } from '../../lib/revealVariants.js'
import { formatGroundAddress, hasValue } from '../../models/groundDiscovery.model.js'

// Phase 13 Step 19 — ground.description is real API data now, not a
// hardcoded paragraph. A missing description gets a plain, honest
// fallback line, never an invented "about this ground" paragraph.
export default function GroundAbout({ ground }) {
  const address = formatGroundAddress(ground)

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2">
      <ScrollReveal
        variant={fadeUpSoft}
        amount={0.4}
        className="flex flex-col justify-center rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent p-6 shadow-lg shadow-black/20"
      >
        <p className="text-emerald-100/70">
          {hasValue(ground.description) ? ground.description : `${ground.name} hasn't added a description yet.`}
        </p>
      </ScrollReveal>

      {hasValue(address) && (
        <ScrollReveal
          variant={mapReveal}
          amount={0.3}
          className="min-h-64 overflow-hidden rounded-2xl border border-emerald-400/15 shadow-lg shadow-black/20"
        >
          <iframe
            title={`${ground.name} location`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            className="h-full min-h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </ScrollReveal>
      )}
    </div>
  )
}
