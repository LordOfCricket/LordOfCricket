import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useTournaments } from '../../hooks/useTournaments.js'
import { useAuth } from '../../hooks/useAuth.js'
import TournamentCard from '../../components/tournaments/TournamentCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'
import BackButton from '../../components/common/BackButton.jsx'

const TABS = [
  { key: 'LIVE', label: 'Live' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'COMPLETED', label: 'Completed' },
]

export default function TournamentsPage() {
  const { user } = useAuth()
  const [category, setCategory] = useState('LIVE')
  const { result, loading, error } = useTournaments(category)

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <BackButton fallback="/" />
          {user?.role === 'staff' && (
            <Link
              to="/tournaments/new"
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Create Tournament
            </Link>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold text-white">Tournaments</h1>
        <p className="mt-1 text-sm text-slate-300">Every competition at the ground — live, upcoming, and completed.</p>

        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                category === tab.key ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading && <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-slate-300">Loading tournaments…</div>}
          {!loading && error && <StatsErrorState message={error} onRetry={() => window.location.reload()} />}
          {!loading && !error && result && result.items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-slate-300">No tournaments here yet.</div>
          )}
          {!loading && !error && result && result.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((t) => (
                <TournamentCard key={t.publicTournamentId} tournament={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
