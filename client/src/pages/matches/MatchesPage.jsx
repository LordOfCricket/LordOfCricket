import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePublicMatches } from '../../hooks/usePublicMatches.js'
import { CATEGORIES } from '../../models/matchDiscovery.model.js'
import MatchCard from '../../components/matches/MatchCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'

const PAGE_SIZE = 12

const EMPTY_STATE = {
  LIVE: { message: 'No matches are live right now.', actionLabel: 'View Upcoming Matches', actionTab: 'UPCOMING' },
  UPCOMING: { message: 'No upcoming matches scheduled yet.', actionLabel: 'Check Recent Results', actionTab: 'RESULTS' },
  RESULTS: { message: 'No completed matches yet.', actionLabel: 'View Upcoming Matches', actionTab: 'UPCOMING' },
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-5" role="status" aria-label="Loading match">
      <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-8 w-full animate-pulse rounded-full bg-white/5" />
    </div>
  )
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [offset, setOffset] = useState(0)

  // Stable, deliberate default (Part 19): always LIVE, never conditional on
  // whether live matches currently exist — that would need an extra fetch
  // before the tab bar could render and risks a jarring post-load tab jump.
  const tab = CATEGORIES.some((c) => c.key === searchParams.get('tab')) ? searchParams.get('tab') : 'LIVE'

  // Part 99 — the LIVE tab refreshes itself every ~20s while visible (paused
  // when hidden, via the shared transport); UPCOMING/RESULTS fetch once per
  // param change like Part 1 shipped, no reason to auto-poll a fixture list
  // or a results archive.
  const { result, loading, error, retry } = usePublicMatches({ category: tab, limit: PAGE_SIZE, offset, pollIntervalMs: tab === 'LIVE' ? 20000 : undefined })

  const selectTab = (key) => {
    setOffset(0)
    setSearchParams({ tab: key }, { replace: true })
  }

  const empty = EMPTY_STATE[tab]

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mt-4 text-3xl font-bold text-white">Matches</h1>
        <p className="mt-1 text-sm text-slate-300">Follow cricket happening on Lord Of Cricket.</p>

        <div className="mt-6 flex gap-1 rounded-full border border-white/10 bg-slate-900/50 p-1" role="tablist" aria-label="Match category">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={tab === c.key}
              onClick={() => selectTab(c.key)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab === c.key ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && <StatsErrorState message={error} onRetry={retry} />}

          {!loading && !error && result && result.items.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
              <p className="text-sm text-slate-300">{empty.message}</p>
              <button
                type="button"
                onClick={() => selectTab(empty.actionTab)}
                className="rounded-full border border-emerald-400/30 px-5 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/10"
              >
                {empty.actionLabel}
              </button>
            </div>
          )}

          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {result.items.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>

              {result.pagination.total > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="rounded-full border border-white/10 px-4 py-2 font-semibold transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    {offset + 1}–{Math.min(offset + PAGE_SIZE, result.pagination.total)} of {result.pagination.total}
                  </span>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= result.pagination.total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="rounded-full border border-white/10 px-4 py-2 font-semibold transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
