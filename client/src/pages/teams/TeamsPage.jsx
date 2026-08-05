import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search, ArrowLeft, Shield } from 'lucide-react'
import { usePublicTeams } from '../../hooks/usePublicTeams.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import TeamCard from '../../components/teams/TeamCard.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'

const PAGE_SIZE = 12

function CardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-5" role="status" aria-label="Loading team">
      <div className="h-20 w-20 animate-pulse rounded-full bg-white/10" />
      <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
      <div className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
    </div>
  )
}

export default function TeamsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [offset, setOffset] = useState(0)

  const debouncedQuery = useDebouncedValue(query, 300)
  const { result, loading, error } = usePublicTeams({ search: debouncedQuery || undefined, limit: PAGE_SIZE, offset })

  // Reflects the search term into the URL (Part 58) — shareable, back-button-friendly.
  useEffect(() => {
    const next = {}
    if (debouncedQuery) next.search = debouncedQuery
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const changeQuery = (value) => {
    setOffset(0)
    setQuery(value)
  }
  const clearSearch = () => changeQuery('')

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="mt-1 text-sm text-slate-300">Discover cricket teams on Lord Of Cricket.</p>
          </div>
          <Link
            to="/teams/compare"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition-colors hover:bg-white/10"
          >
            <Shield className="h-4 w-4" />
            Compare Teams
          </Link>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search teams..."
            aria-label="Search teams"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
          />
        </div>

        <div className="mt-6">
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && <StatsErrorState message={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && result && result.items.length === 0 && debouncedQuery && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
              <p className="text-sm text-slate-300">No teams found for &ldquo;{debouncedQuery}&rdquo;.</p>
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-full border border-emerald-400/30 px-5 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/10"
              >
                Clear Search
              </button>
            </div>
          )}

          {!loading && !error && result && result.items.length === 0 && !debouncedQuery && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-slate-300">No teams yet.</div>
          )}

          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((team) => (
                  <TeamCard key={team.id} team={team} />
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
