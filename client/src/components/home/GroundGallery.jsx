import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, ImageIcon, ArrowRight } from 'lucide-react'
import { useGroundGallery } from '../../hooks/useGroundGallery.js'
import { GROUND_ADDRESS } from '../../models/homepage.model.js'
import { EASE } from '../../lib/motion.js'

const AUTO_ADVANCE_MS = 5500

function GalleryFrame({ children, className = '' }) {
  return (
    <div
      className={`relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-loc-card-dark shadow-xl shadow-black/40 sm:h-80 md:h-96 lg:h-full ${className}`}
    >
      {children}
    </div>
  )
}

function GalleryOverlay({ showViewAll = true }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-6">
        <div className="min-w-0">
          <p className="font-loc-display text-[11px] font-bold tracking-[0.18em] text-loc-gold uppercase">
            Lord Of Cricket Ground
          </p>
          <p className="mt-0.5 truncate font-loc-body text-xs text-loc-warmwhite/75 sm:text-sm">{GROUND_ADDRESS}</p>
        </div>
        {showViewAll && (
          <a
            href="#gallery"
            className="inline-flex shrink-0 items-center gap-1.5 font-loc-display text-xs font-semibold tracking-wide text-loc-warmwhite/90 uppercase transition-colors hover:text-loc-gold"
          >
            View Gallery
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </>
  )
}

function EmptyGallery({ className = '' }) {
  return (
    <GalleryFrame className={className}>
      <img
        src="/images/cricket-stadium.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-loc-dark/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <ImageIcon className="h-8 w-8 text-loc-text2-dark" aria-hidden="true" />
        <p className="font-loc-body text-sm text-loc-text2-dark">Ground photos coming soon</p>
      </div>
      <GalleryOverlay showViewAll={false} />
    </GalleryFrame>
  )
}

export default function GroundGallery({ className = '' }) {
  const { photos, loading } = useGroundGallery()
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = photos?.length ?? 0

  useEffect(() => {
    if (reduceMotion || paused || count <= 1) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [reduceMotion, paused, count])

  if (loading) {
    return (
      <GalleryFrame className={`animate-pulse ${className}`}>
        <div className="absolute inset-0 bg-white/5" />
      </GalleryFrame>
    )
  }

  if (!photos || count === 0) {
    return <EmptyGallery className={className} />
  }

  const goTo = (i) => setIndex((i + count) % count)
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)
  const current = photos[index]

  return (
    <GalleryFrame className={className}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Ground photo gallery"
        className="absolute inset-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={current.id}
            src={current.imageUrl}
            alt={current.alt}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? false : { opacity: 0, scale: 1 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1.04 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.7, ease: EASE } }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { opacity: { duration: 1, ease: EASE }, scale: { duration: AUTO_ADVANCE_MS / 1000 + 1, ease: 'easeOut' } }
            }
          />
        </AnimatePresence>

        <GalleryOverlay />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous ground photo"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-loc-dark/50 p-2 text-loc-warmwhite opacity-70 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next ground photo"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-loc-dark/50 p-2 text-loc-warmwhite opacity-70 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-2" role="tablist" aria-label="Choose ground photo">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Photo ${i + 1} of ${count}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-5 bg-loc-gold' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </GalleryFrame>
  )
}
