import { motion, useReducedMotion } from 'motion/react'
import GroundGallery from './GroundGallery.jsx'
import LocMatchPanel from './LocMatchPanel.jsx'
import IndiaMatchPanel from './IndiaMatchPanel.jsx'

const EASE = [0.16, 1, 0.3, 1]

// Entrance sequence: background (instant) → gallery → LOC panel → India
// panel, a short cascade rather than a marketing reveal — the hero's job now
// is "show the ground and the scores fast", not stage a headline moment.
const DELAY = { gallery: 0.08, loc: 0.22, india: 0.32 }

function reveal(delay) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: EASE },
  }
}

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const motionProps = (delay) => (reduceMotion ? {} : reveal(delay))

  return (
    <section className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-loc-dark">
      {/* Restrained atmosphere: real ground photography carries the visual
          weight now, so the backdrop stays quiet — a dark wash + one soft
          floodlight glow, nothing competing with the photo or the scores. */}
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 55% 45% at 80% 0%, rgba(63,143,95,0.14), transparent 65%)',
              'linear-gradient(160deg, #10201a 0%, #0e1210 55%, #0a0d0b 100%)',
            ].join(','),
          }}
        />
        {!reduceMotion && (
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 45% 40% at 80% 0%, rgba(243,241,231,0.08), transparent 65%)' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col pt-20 pb-5 lg:pt-24 lg:pb-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-4 sm:px-6 lg:px-8">
          {/* Strict 2:1 composition — gallery (2fr) beside a LOC/India stack
              (1fr) on desktop; gallery full-width above a 2-col LOC/India
              row on tablet; everything stacked on mobile, gallery first. */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:h-140 lg:grid-cols-[2fr_1fr] lg:gap-5 xl:h-155">
            <motion.div {...motionProps(DELAY.gallery)} className="lg:h-full">
              <GroundGallery className="lg:h-full" />
            </motion.div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:h-full lg:grid-cols-1 lg:gap-5">
              <motion.div {...motionProps(DELAY.loc)} className="lg:h-full">
                <LocMatchPanel className="lg:h-full" />
              </motion.div>
              <motion.div {...motionProps(DELAY.india)} className="lg:h-full">
                <IndiaMatchPanel className="lg:h-full" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
