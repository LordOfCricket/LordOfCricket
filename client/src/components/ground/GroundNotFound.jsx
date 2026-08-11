import { Link } from 'react-router-dom'

// Phase 13 Step 30 — a ground id that doesn't exist (or is DRAFT/SUSPENDED,
// which the API 404s identically — Phase 12) must never fall back to
// showing the real seeded ground or auto-redirect anywhere. Styled to match
// the router-level NotFoundPage.jsx for visual consistency.
export default function GroundNotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">404</span>
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Ground not found</h1>
      <p className="text-emerald-100/60">This ground doesn't exist, or isn't publicly available right now.</p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
      >
        Find Cricket Grounds
      </Link>
    </div>
  )
}
