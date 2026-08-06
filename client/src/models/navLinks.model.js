import {
  LayoutDashboard,
  User,
  Users,
  CalendarDays,
  BarChart3,
  UtensilsCrossed,
  Settings,
  Search,
  Trophy,
  ClipboardList,
  CalendarClock,
} from 'lucide-react'

// Phase 13 — the account nav was previously one static list for every
// logged-in user, which sent staff to `/player/dashboard` (a page for a
// player profile staff accounts don't have) and never surfaced the match
// operations hub to staff or approved umpires at all. `user` is the auth
// context's user (role/player_type), not the player profile.
export function getAccountLinks(user) {
  const isStaff = user?.role === 'staff'
  const isSuperAdminOrAdmin = isStaff && ['super_admin', 'admin'].includes(user?.staff_role)
  const isScorer = (isStaff && user?.staff_role === 'super_admin') || user?.player_type === 'umpire'

  const links = [
    isStaff
      ? { label: 'Staff Dashboard', to: isSuperAdminOrAdmin ? '/admin/dashboard' : '/canteen/staff', icon: LayoutDashboard }
      : { label: 'View Dashboard', to: '/player/dashboard', icon: LayoutDashboard },
  ]

  if (!isStaff) {
    links.push(
      { label: 'My Profile', to: '/profile', icon: User },
      { label: 'My Teams', to: '/player/dashboard#teams', icon: Users },
      { label: 'My Matches', to: '/player/dashboard#matches', icon: CalendarDays },
      { label: 'My Statistics', to: '/player/dashboard#career', icon: BarChart3 },
    )
  }

  if (isScorer) {
    links.push({ label: 'Manage Matches', to: '/umpire', icon: ClipboardList })
  }

  links.push(
    { label: 'Players', to: '/players', icon: Search },
    { label: 'Leaderboards', to: '/leaderboards', icon: Trophy },
    { label: 'Canteen', to: '/canteen', icon: UtensilsCrossed },
    // Phase 14 Part 3 — staff manage the ground's whole schedule (bookings +
    // blocks); everyone else only ever sees their own bookings.
    isStaff ? { label: 'Ground Bookings', to: '/bookings/staff', icon: CalendarClock } : { label: 'My Bookings', to: '/bookings', icon: CalendarClock },
  )

  if (!isStaff) {
    links.push({ label: 'Settings', to: '/profile/edit', icon: Settings })
  }

  return links
}
