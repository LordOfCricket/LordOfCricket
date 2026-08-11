import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, ClipboardCheck, MapPinPlus, Images, UserPlus, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

const LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, allow: ['super_admin', 'admin'] },
  { to: '/canteen/staff', label: 'Canteen', icon: UtensilsCrossed, allow: ['super_admin', 'admin'] },
  { to: '/admin/umpire-requests', label: 'Umpire Requests', icon: ClipboardCheck, allow: ['super_admin'] },
  { to: '/admin/ground-registrations', label: 'Ground Registrations', icon: MapPinPlus, allow: ['super_admin'] },
  { to: '/admin/photos-hub', label: 'Edit Photos', icon: Images, allow: ['super_admin'] },
  { to: '/admin/staff/new', label: 'Create Staff', icon: UserPlus, allow: ['super_admin'] },
]

export default function AdminSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = LINKS.filter((link) => link.allow.includes(user?.staff_role))

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-full flex-col gap-6 rounded-[32px] border border-white/15 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-2xl lg:w-72 lg:shrink-0">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Signed in as</p>
        <p className="mt-1 text-lg font-bold text-white">{user?.name}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{user?.staff_role?.replace('_', ' ')}</p>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-green-600 text-white' : 'text-slate-200 hover:bg-white/10'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  )
}
