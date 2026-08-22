import { MapPin } from 'lucide-react'
import { formatGroundAddress, hasValue } from '../../models/groundDiscovery.model.js'

export default function LocationMap({ ground }) {
  const address = formatGroundAddress(ground)

  if (!hasValue(address)) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4AF37]/20 bg-[#064B38]/10 px-8 py-12 text-center">
        <p className="text-[#B5C2BC]">Location information not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Google Map Embed */}
      <div className="h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#D4AF37]/20 shadow-lg shadow-[#064B38]/30">
        <iframe
          title={`${ground.name} location map`}
          src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3506.123456!2d${ground.longitude || 77.1}!3d${ground.latitude || 28.6}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${encodeURIComponent(address)}!2s${encodeURIComponent(address)}!5e0!3m2!1sen!2sin!4v1234567890`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
        />
      </div>

      {/* Full Address Below Map */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-[#D4AF37] mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <h3 className="font-semibold text-[#F5F7F5] text-sm">{ground.name}</h3>
            <p className="text-[#B5C2BC] leading-snug text-sm">{address}</p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-1.5 pt-3 border-t border-[#D4AF37]/10">
          {hasValue(ground.phone) && (
            <a
              href={`tel:${ground.phone}`}
              className="block text-sm text-[#B5C2BC] hover:text-[#D4AF37] transition-colors"
            >
              📞 {ground.phone}
            </a>
          )}
          {hasValue(ground.email) && (
            <a
              href={`mailto:${ground.email}`}
              className="block text-sm text-[#B5C2BC] hover:text-[#D4AF37] transition-colors"
            >
              ✉️ {ground.email}
            </a>
          )}
          {hasValue(ground.website) && (
            <a
              href={ground.website}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-[#B5C2BC] hover:text-[#D4AF37] transition-colors"
            >
              🌐 Visit Website
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
