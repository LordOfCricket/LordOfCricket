import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { searchPlayers } from '../../services/statisticsApi.js'
import { fetchTeams } from '../../services/playerApi.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { PLAYING_ROLE_LABELS } from '../../models/player.model.js'
import PlayerCard from '../../components/players/PlayerCard.jsx'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import BackButton from '../../components/common/BackButton.jsx'

const ROLE_OPTIONS = [{ value: '', label: 'All' }, ...Object.entries(PLAYING_ROLE_LABELS).map(([value, label]) => ({ value, label }))]
const PAGE_SIZE = 12

export default function PlayersDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [teamId, setTeamId] = useState(searchParams.get('team') || '')
  const [teams, setTeams] = useState([])
  const [offset, setOffset] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const debouncedQuery = useDebouncedValue(query, 350)

  useEffect(() => {
    fetchTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  const load = useCallback(() => {
    const request = searchPlayers({ q: debouncedQuery || undefined, role: role || undefined, teamId: teamId || undefined, limit: PAGE_SIZE, offset })
    return request
      .then((data) => {
        setResult(data)
        setError(null)
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load players."))
      .finally(() => setLoading(false))
  }, [debouncedQuery, role, teamId, offset])

  // Fetching is the effect; setLoading(true) happens at the call sites that
  // actually change a filter/page (the handlers below) — never synchronously
  // inside this effect — so a plain refetch never fights React's render cycle.
  useEffect(() => {
    load()
  }, [load])

  // Reflects filters into the URL (Part 51) — shareable, back-button-friendly.
  useEffect(() => {
    const next = {}
    if (debouncedQuery) next.q = debouncedQuery
    if (role) next.role = role
    if (teamId) next.team = teamId
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, role, teamId])

  const changeQuery = (value) => {
    setLoading(true)
    setOffset(0)
    setQuery(value)
  }
  const changeRole = (value) => {
    setLoading(true)
    setOffset(0)
    setRole(value)
  }
  const changeTeam = (value) => {
    setLoading(true)
    setOffset(0)
    setTeamId(value)
  }
  const changePage = (nextOffset) => {
    setLoading(true)
    setOffset(nextOffset)
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.82), rgba(2,6,23,0.82)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-6xl">
        <BackButton fallback="/" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="mt-1 text-sm text-slate-300">Discover players across Lord Of Cricket</p>
          </div>
          <Link
            to="/players/compare"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition-colors hover:bg-white/10"
          >
            <Users className="h-4 w-4" />
            Compare Players
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Search players by name or ID..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeRole(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  role === opt.value ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <select
              value={teamId}
              onChange={(e) => changeTeam(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
            >
              <option value="" className="bg-slate-900">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {loading && <StatsLoadingGrid tiles={6} />}
          {!loading && error && <StatsErrorState message={error} onRetry={load} />}
          {!loading && !error && result && result.items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-slate-300">
              No players match your search.
            </div>
          )}
          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((item) => (
                  <PlayerCard key={item.player.publicPlayerId} player={item.player} career={item.career} />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}
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
                  onClick={() => changePage(offset + PAGE_SIZE)}
                  className="rounded-full border border-white/10 px-4 py-2 font-semibold transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
