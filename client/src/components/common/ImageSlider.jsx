import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { getGroundPhotos } from '../../services/groundPhotos.js'

export default function ImageSlider() {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getGroundPhotos()
      .then((photos) => setSlides(photos))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-3xl border border-emerald-400/15 text-emerald-100/60">
        Loading photos…
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald-400/20 px-6 text-emerald-100/60">
        <ImageIcon className="h-10 w-10" />
        <p>No ground photos yet — add rows to the ground_photos table</p>
      </div>
    )
  }

  const goTo = (i) => setIndex((i + slides.length) % slides.length)
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-emerald-400/15 shadow-2xl shadow-black/40">
      {/* Track */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="h-full w-full shrink-0">
            <img
              src={slide.image_url}
              alt={slide.title || 'Ground photo'}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Prev / Next arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-950/50 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:bg-emerald-950/80 hover:scale-110"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-950/50 p-2 text-white backdrop-blur-sm transition-all duration-200 hover:bg-emerald-950/80 hover:scale-110"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-emerald-400' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
