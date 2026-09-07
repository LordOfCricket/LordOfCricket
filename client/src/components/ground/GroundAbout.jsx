import ScrollReveal from '../common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'
import { hasValue } from '../../models/groundDiscovery.model.js'

// ground.description is real API data now, not a
// hardcoded paragraph. A missing description gets a plain, honest
// fallback line, never an invented "about this ground" paragraph.
export default function GroundAbout({ ground }) {
  return (
    <div className="w-full max-w-2xl">
      <ScrollReveal
        variant={fadeUpSoft}
        amount={0.4}
        className="flex flex-col justify-center rounded-2xl border border-emerald-400/15 bg-linear-to-b from-white/6 to-transparent p-5 shadow-lg shadow-black/20"
      >
        <p className="text-emerald-100/70">
          {hasValue(ground.description) ? ground.description : `${ground.name} hasn't added a description yet.`}
        </p>
      </ScrollReveal>
    </div>
  )
}
