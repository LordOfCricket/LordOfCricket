import { useEffect, useState } from 'react'
import { getAmenities } from '../../services/amenities.js'

export default function AmenitiesGrid() {
  const [amenities, setAmenities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAmenities()
      .then((data) => setAmenities(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-emerald-100/60">Loading amenities…</p>
  }

  if (amenities.length === 0) {
    return <p className="text-emerald-100/60">No amenities added yet</p>
  }

  return (
    <div className="flex w-full flex-wrap justify-center gap-8 px-6 lg:gap-10 lg:px-10">
      {amenities.map((amenity) => (
        <div
          key={amenity.id}
          className="flex w-36 flex-col items-center gap-4 sm:w-44 lg:w-48"
        >
          <div className="h-36 w-36 overflow-hidden rounded-2xl border border-emerald-400/15 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:border-emerald-400/50 hover:shadow-emerald-500/20 sm:h-44 sm:w-44 lg:h-48 lg:w-48">
            <img
              src={amenity.image_url}
              alt={amenity.name}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-center text-base font-medium text-emerald-50 sm:text-lg">
            {amenity.name}
          </span>
        </div>
      ))}
    </div>
  )
}
