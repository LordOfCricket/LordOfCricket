import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, LogIn, LogOut, UtensilsCrossed, FlaskConical, User, Users, CalendarDays, BarChart3, Settings, LayoutDashboard, Search, Trophy } from 'lucide-react'
import logo from '../../assets/logo.png'
import { useAuth } from '../../hooks/useAuth.js'
import Avatar from '../ui/Avatar.jsx'
import NotificationBell from './NotificationBell.jsx'
import AccountMenu from './AccountMenu.jsx'
import { roleLabel } from '../../models/player.model.js'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Live Score', href: '#live-score' },
  { label: 'About', href: '#about' },
  { label: 'Tournament', href: '#tournament' },
  { label: 'Booking', href: '#booking' },
  { label: 'Team', href: '#team' },
]

const ACCOUNT_LINKS = [
  { label: 'View Dashboard', to: '/player/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', to: '/profile', icon: User },
  { label: 'My Teams', to: '/player/dashboard#teams', icon: Users },
  { label: 'My Matches', to: '/player/dashboard#matches', icon: CalendarDays },
  { label: 'My Statistics', to: '/player/dashboard#career', icon: BarChart3 },
  { label: 'Players', to: '/players', icon: Search },
  { label: 'Leaderboards', to: '/leaderboards', icon: Trophy },
  { label: 'Canteen', to: '/canteen', icon: UtensilsCrossed },
  { label: 'Settings', to: '/profile/edit', icon: Settings },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, player, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-emerald-950/70 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="flex w-full items-center justify-between px-6 py-2 lg:px-10">
        <a href="#home" className="group flex h-14 items-center overflow-hidden lg:h-16">
          <img
            src={logo}
            alt="LOC - Lord Of Cricket"
            className="h-36 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105 lg:h-40"
          />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative px-4 py-2 text-base font-medium text-emerald-100/70 transition-colors duration-200 hover:text-white"
            >
              {link.label}
              <span className="absolute inset-x-4 -bottom-0.5 h-px scale-x-0 bg-emerald-400 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          {!user && (
            <>
              <Link
                to="/testing"
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-white/5 px-6 py-3 text-base font-semibold text-amber-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-white/10"
              >
                <FlaskConical className="h-5 w-5" />
                Umpire Testing
              </Link>
              <Link
                to="/canteen"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-white/5 px-6 py-3 text-base font-semibold text-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-white/10"
              >
                <UtensilsCrossed className="h-5 w-5" />
                Canteen
              </Link>
            </>
          )}

          {user ? (
            <>
              <NotificationBell />
              <AccountMenu user={user} player={player} onLogout={handleLogout} />
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-base font-semibold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all duration-200 hover:shadow-emerald-400/50 hover:-translate-y-0.5"
            >
              <LogIn className="h-5 w-5" />
              Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-emerald-100 transition-colors hover:bg-white/10 lg:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-all duration-300 lg:hidden ${
          isOpen ? 'max-h-168 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1 border-t border-white/10 bg-emerald-950/95 px-6 py-4 backdrop-blur-xl">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <Avatar name={user.name} photoUrl={player?.photo_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{user.name}</p>
                {player?.public_player_id && (
                  <p className="text-xs font-semibold tracking-wide text-emerald-300">{player.public_player_id}</p>
                )}
                <p className="text-xs text-emerald-100/60">{roleLabel(player?.role) || 'Complete your profile'}</p>
              </div>
            </div>
          )}

          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-medium text-emerald-100/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}

          {user && (
            <div className="mt-2 border-t border-white/10 pt-2">
              {ACCOUNT_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-emerald-100/80 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-emerald-300" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          )}

          <Link
            to="/testing"
            onClick={() => setIsOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-white/5 px-5 py-3 text-sm font-semibold text-amber-200 transition-all hover:border-amber-400/60 hover:bg-white/10"
          >
            <FlaskConical className="h-4 w-4" />
            Umpire Testing
          </Link>

          {!user && (
            <Link
              to="/canteen"
              onClick={() => setIsOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-white/5 px-5 py-3 text-sm font-semibold text-emerald-100 transition-all hover:border-emerald-400/60 hover:bg-white/10"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Canteen
            </Link>
          )}

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-rose-500 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-rose-900/30 transition-all hover:shadow-rose-500/40"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:shadow-emerald-400/50"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
