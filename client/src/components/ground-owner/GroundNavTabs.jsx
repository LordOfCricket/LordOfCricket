import { Link, useParams, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'Matches', path: '' },
  { label: 'Operations', path: '/operations' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Reviews', path: '/reviews' },
  { label: 'Profile', path: '/profile' },
  { label: 'Photos & Gallery', path: '/media' },
  { label: 'Amenities', path: '/amenities' },
  { label: 'Location', path: '/location' },
  { label: 'Bookings', path: '/bookings' },
  { label: 'Canteen', path: '/canteen' },
  { label: 'Staff', path: '/staff' },
]

export default function GroundNavTabs() {
  const { publicGroundId } = useParams()
  const location = useLocation()

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10">
      {TABS.map((tab) => {
        const href = `/ground-owner/grounds/${publicGroundId}${tab.path}`
        const isActive = location.pathname === href
        return (
          <Link
            key={tab.path}
            to={href}
            className={`shrink-0 px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? 'border-b-2 border-green-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
