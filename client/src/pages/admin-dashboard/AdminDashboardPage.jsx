import { Link } from 'react-router-dom'
import { UtensilsCrossed, ClipboardCheck, Images, UserPlus } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import BackButton from '../../components/common/BackButton.jsx'

const ALL_CARDS = [
  {
    to: '/canteen/staff',
    icon: UtensilsCrossed,
    title: 'Canteen',
    description: 'Manage food, stock and orders.',
    cta: 'Manage Canteen',
    allow: ['super_admin', 'admin'],
  },
  {
    to: '/admin/umpire-requests',
    icon: ClipboardCheck,
    title: 'Umpire Requests',
    description: 'Review and approve umpire requests.',
    cta: 'View Requests',
    allow: ['super_admin'],
  },
  {
    to: '/admin/photos-hub',
    icon: Images,
    title: 'Edit Photos',
    description: 'Manage homepage, amenities and gallery images.',
    cta: 'Manage Photos',
    allow: ['super_admin'],
  },
  {
    to: '/admin/staff/new',
    icon: UserPlus,
    title: 'Create Staff',
    description: 'Create Admin or Canteen Staff accounts.',
    cta: 'Create Staff',
    allow: ['super_admin'],
  },
]

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const cards = ALL_CARDS.filter((card) => card.allow.includes(user?.staff_role))

  return (
    <AdminLayout title="Super Admin Dashboard" subtitle="Manage canteen operations, umpire approvals, site photos and staff accounts.">
      <BackButton fallback="/" className="mb-4" />
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map(({ to, icon: Icon, title, description, cta }) => (
          <article key={to} className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 text-green-300">
                <Icon size={24} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-300">{description}</p>
            </div>
            <Link
              to={to}
              className="mt-6 inline-flex w-fit items-center justify-center rounded-2xl bg-gradient-to-r from-green-700 via-green-500 to-lime-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/40 transition-all hover:scale-[1.02] hover:brightness-110"
            >
              {cta}
            </Link>
          </article>
        ))}
      </div>
    </AdminLayout>
  )
}
