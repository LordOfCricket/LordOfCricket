import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Menu, X, ArrowRight } from 'lucide-react'
import logo from '../../assets/logo.png'
import { useAuth } from '../../hooks/useAuth.js'
import NotificationBell from '../layout/NotificationBell.jsx'
import AccountMenu from '../layout/AccountMenu.jsx'
import { EASE, SPRING } from '../../lib/motion.js'
import useMagneticHover from '../../hooks/useMagneticHover.js'

const CTA_CLASSNAME =
  'group inline-flex h-11 items-center gap-2 rounded-sm bg-loc-stadium px-5 font-loc-display text-[13px] font-semibold tracking-[0.03em] text-loc-warmwhite uppercase transition-colors duration-200 hover:bg-loc-stadium-hover'

// Desktop-only primary CTA — a small, effortless pull toward the cursor
// within its own bounds (capped ~8px, springed). `<Link>` and its `group`
// class stay exactly as they were, just nested inside the new wrapper, so
// the icon's existing group-hover animation is unaffected.
function MagneticCta({ to, children }) {
  const { enabled, style, onPointerMove, onPointerLeave } = useMagneticHover()

  if (!enabled) {
    return (
      <Link to={to} className={CTA_CLASSNAME}>
        {children}
      </Link>
    )
  }

  return (
    <motion.span className="inline-block" style={style} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <Link to={to} className={CTA_CLASSNAME}>
        {children}
      </Link>
    </motion.span>
  )
}

// LOC Design System v1 — Section 03/05: nav links use Barlow (body), an
// active route gets a small gold underline rather than a filled "tab".
const NAV_LINKS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Grounds', to: '/grounds' },
  { label: 'Matches', to: '/matches' },
  { label: 'Players', to: '/players' },
  { label: 'Teams', to: '/teams' },
  { label: 'Tournaments', to: '/tournaments' },
]

function NavItem({ link, onClick, className = '', activeClassName = '', underline = true }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative font-loc-body text-[15px] font-medium tracking-wide transition-colors duration-200 ${
          isActive ? `text-loc-warmwhite ${activeClassName}` : 'text-loc-text2-dark hover:text-loc-warmwhite'
        } ${className}`
      }
    >
      {({ isActive }) => (
        <>
          {link.label}
          {underline && isActive && (
            <motion.span
              layoutId="loc-nav-underline"
              className="absolute inset-x-0 -bottom-1.5 h-[2px] rounded-full bg-loc-gold"
              transition={SPRING}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// Same visual treatment as NavItem (text/hover style), but a <button> — this
// opens the gallery modal in place, not a route.
function GalleryNavButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-loc-body text-[15px] font-medium text-loc-text2-dark transition-colors duration-200 hover:text-loc-warmwhite ${className}`}
    >
      Gallery
    </button>
  )
}

export default function Navbar({ onOpenGallery, canteenHref } = {}) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, player, logout } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mobile menu: lock page scroll, close on Escape, return focus to trigger.
  useEffect(() => {
    if (!menuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector('a, button')?.focus()
    }, reduceMotion ? 0 : 260)

    const triggerEl = toggleRef.current

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      triggerEl?.focus()
    }
  }, [menuOpen, reduceMotion])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const panelTransition = { duration: reduceMotion ? 0 : 0.28, ease: EASE }

  return (
    <motion.header
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50 lg:top-4 lg:px-4"
    >
      {/* Opacity-only entrance, deliberately — animating `y` here would apply
          a `transform`, which makes this element the containing block for
          the `position: fixed` mobile-menu overlay/panel below, breaking
          their viewport-relative positioning. */}
      {/* Steady-state: a translucent stadium surface even at the top of the
          hero, not fully invisible — it deepens (more opacity/blur/shadow)
          on scroll rather than switching on from nothing. Desktop only gets
          the floating inset + rounded corners; mobile stays edge-to-edge for
          maximum tap-friendly width. */}
      <div
        className={`mx-auto grid h-15 w-full max-w-300 grid-cols-[auto_1fr_auto] items-center gap-4 border px-5 backdrop-blur-md transition-all duration-300 lg:h-18 lg:rounded-2xl lg:border-white/8 lg:px-8 lg:backdrop-blur-lg ${
          scrolled
            ? 'border-white/12 bg-loc-dark/90 shadow-lg shadow-black/30 lg:bg-loc-dark/90'
            : 'border-white/6 bg-loc-dark/55 lg:bg-loc-dark/55'
        }`}
      >
        <Link to="/" className="flex h-full items-center" aria-label="LOC — Lord Of Cricket home">
          {/* logo.png is the full lockup (lion + "LORD OF CRICKET"), trimmed
              only of its outer transparent padding — nothing cropped out.
              The wordmark is dark navy (designed for a light background), so
              a soft light drop-shadow gives it an edge against the dark bar
              instead of disappearing into it. */}
          <img
            src={logo}
            alt=""
            className="h-12 w-auto lg:h-16"
            style={{ filter: 'drop-shadow(0 0 1.2px rgba(243,241,231,0.9)) drop-shadow(0 0 1.2px rgba(243,241,231,0.9))' }}
          />
        </Link>

        <nav aria-label="Primary" className="hidden justify-center lg:flex">
          <div className="flex items-center gap-9">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.label} link={link} />
            ))}
            {canteenHref && <NavItem link={{ label: 'Canteen', to: canteenHref }} />}
            {onOpenGallery && <GalleryNavButton onClick={onOpenGallery} />}
          </div>
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          {user ? (
            <>
              <NotificationBell />
              <AccountMenu user={user} player={player} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="font-loc-body text-[15px] font-medium text-loc-text2-dark transition-colors duration-200 hover:text-loc-warmwhite"
              >
                Sign In
              </Link>
              <MagneticCta to="/login">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </MagneticCta>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="loc-mobile-nav"
          className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-loc-warmwhite transition-colors hover:bg-white/10 lg:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="loc-mobile-backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            className="fixed inset-0 top-15 z-40 bg-black/40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
            <motion.div
              key="loc-mobile-panel"
              id="loc-mobile-nav"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
              transition={panelTransition}
              className="fixed inset-x-0 top-15 z-40 max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-white/8 bg-loc-dark px-5 pt-4 pb-8 lg:hidden"
            >
              {user && (
                <div className="mb-2 flex items-center gap-3 rounded-sm border border-white/8 bg-loc-card-dark px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-loc-body text-base font-semibold text-loc-warmwhite">{user.name}</p>
                    <p className="text-xs text-loc-muted-dark">Signed in</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <NavItem
                    key={link.label}
                    link={link}
                    underline={false}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-sm px-3 py-4 text-lg"
                    activeClassName="bg-white/5"
                  />
                ))}
                {canteenHref && (
                  <NavItem
                    link={{ label: 'Canteen', to: canteenHref }}
                    underline={false}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-sm px-3 py-4 text-lg"
                    activeClassName="bg-white/5"
                  />
                )}
                {onOpenGallery && (
                  <GalleryNavButton
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenGallery()
                    }}
                    className="rounded-sm px-3 py-4 text-left text-lg"
                  />
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3">
                      <NotificationBell />
                      <span className="font-loc-body text-sm text-loc-text2-dark">Notifications</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-12 items-center justify-center rounded-sm border border-white/12 font-loc-display text-[13px] font-semibold tracking-[0.03em] text-loc-warmwhite uppercase"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex h-12 items-center justify-center rounded-sm border border-white/12 font-loc-display text-[13px] font-semibold tracking-[0.03em] text-loc-warmwhite uppercase"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-loc-stadium font-loc-display text-[13px] font-semibold tracking-[0.03em] text-loc-warmwhite uppercase"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
