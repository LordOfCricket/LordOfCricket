import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { fetchLeaderboard } from '../../services/statisticsApi.js'
import { fetchTeams } from '../../services/playerApi.js'
import { PLAYING_ROLE_LABELS } from '../../models/player.model.js'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import LeaderboardPodium from '../../components/leaderboards/LeaderboardPodium.jsx'
import LeaderboardRow from '../../components/leaderboards/LeaderboardRow.jsx'
import BackButton from '../../components/common/BackButton.jsx'

const METRIC_GROUPS = {
  batting: [
    { key: 'runs', label: 'Top Run Scorers' },
    { key: 'sixes', label: 'Most Sixes' },
    { key: 'fours', label: 'Most Fours' },
    { key: 'fifties', label: 'Most 50s' },
    { key: 'hundreds', label: 'Most 100s' },
    { key: 'batting-average', label: 'Best Average' },
    { key: 'batting-strike-rate', label: 'Best Strike Rate' },
  ],
  bowling: [
    { key: 'wickets', label: 'Top Wicket Takers' },
    { key: 'maidens', label: 'Most Maidens' },
    { key: 'bowling-average', label: 'Best Average' },
    { key: 'economy', label: 'Best Economy' },
    { key: 'best-bowling', label: 'Best Figures' },
  ],
  fielding: [
    { key: 'catches', label: 'Most Catches' },
    { key: 'run-outs', label: 'Most Run Outs' },
    { key: 'stumpings', label: 'Most Stumpings' },
  ],
}
const CATEGORIES = ['batting', 'bowling', 'fielding']
const PAGE_SIZE = 15

function metricCategory(metric) {
  return CATEGORIES.find((cat) => METRIC_GROUPS[cat].some((m) => m.key === metric)) || 'batting'
}

function qualificationText(qualification) {
  if (!qualification) return null
  const parts = []
  if (qualification.minInnings) parts.push(`min ${qualification.minInnings} innings`)
  if (qualification.minDismissals) parts.push(`min ${qualification.minDismissals} dismissal${qualification.minDismissals > 1 ? 's' : ''}`)
  if (qualification.minBallsFaced) parts.push(`min ${qualification.minBallsFaced} balls faced`)
  if (qualification.minWickets) parts.push(`min ${qualification.minWickets} wickets`)
  if (qualification.minEquivalentOvers) parts.push(`min ${qualification.minEquivalentOvers} overs bowled`)
  return parts.length ? `Qualification: ${parts.join(', ')}` : null
}

export default function LeaderboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMetric = searchParams.get('metric') || 'runs'
  const [category, setCategory] = useState(metricCategory(initialMetric))
  const [metric, setMetric] = useState(initialMetric)
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [teamId, setTeamId] = useState(searchParams.get('team') || '')
  const [teams, setTeams] = useState([])
  const [offset, setOffset] = useState(0)
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  const load = useCallback(() => {
    return fetchLeaderboard(metric, { role: role || undefined, teamId: teamId || undefined, limit: PAGE_SIZE, offset })
      .then((data) => {
        setBoard(data)
        setError(null)
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load leaderboard."))
      .finally(() => setLoading(false))
  }, [metric, role, teamId, offset])

  // Fetching is the effect; setLoading(true) happens at the call sites that
  // actually change a metric/filter/page (below) — never synchronously
  // inside this effect.
  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const next = { metric }
    if (role) next.role = role
    if (teamId) next.team = teamId
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, role, teamId])

  const selectMetric = (key) => {
    setLoading(true)
    setOffset(0)
    setMetric(key)
    setCategory(metricCategory(key))
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

  const podiumItems = board && offset === 0 ? board.items.slice(0, 3) : []
  const rowItems = board && offset === 0 ? board.items.slice(3) : board?.items || []

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.82), rgba(2,6,23,0.82)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-4xl">
        <BackButton fallback="/" />

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-300" />
            <h1 className="text-3xl font-bold text-white">Leaderboards</h1>
          </div>
          <Link to="/leaderboards/umpires" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5">
            Top Umpires →
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-300">All-time official rankings, derived from finalized LOC matches.</p>

        {/* Category tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-900/50 p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectMetric(METRIC_GROUPS[cat][0].key)}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                category === cat ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Metric pills within the category */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {METRIC_GROUPS[category].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => selectMetric(m.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                metric === m.key ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={role}
            onChange={(e) => changeRole(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-emerald-400/50 focus:outline-none"
          >
            <option value="" className="bg-slate-900">All Roles</option>
            {Object.entries(PLAYING_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-slate-900">
                {label}
              </option>
            ))}
          </select>
          <select
            value={teamId}
            onChange={(e) => changeTeam(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-emerald-400/50 focus:outline-none"
          >
            <option value="" className="bg-slate-900">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
          {loading && <StatsLoadingGrid tiles={6} />}
          {!loading && error && <StatsErrorState message={error} onRetry={load} />}

          {!loading && !error && board && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{board.title}</h2>
                {board.pagination.total > 0 && <span className="text-xs text-slate-400">{board.pagination.total} ranked</span>}
              </div>

              {board.qualification && qualificationText(board.qualification) && (
                <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                  {qualificationText(board.qualification)}
                </p>
              )}

              {board.items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-slate-300">
                  {board.qualification
                    ? 'No players have met the qualification yet.'
                    : 'No official rankings yet. Rankings appear as LOC matches are finalized.'}
                </div>
              )}

              {board.items.length > 0 && (
                <div className="space-y-4">
                  {podiumItems.length > 0 && <LeaderboardPodium items={podiumItems} unit={board.unit} metric={board.metric} />}
                  <div className="space-y-2">
                    {rowItems.map((item) => (
                      <LeaderboardRow key={item.player.publicPlayerId} item={item} category={board.category} metric={board.metric} unit={board.unit} />
                    ))}
                  </div>
                </div>
              )}

              {board.pagination.total > PAGE_SIZE && (
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
                    #{offset + 1}–#{Math.min(offset + PAGE_SIZE, board.pagination.total)} of {board.pagination.total}
                  </span>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= board.pagination.total}
                    onClick={() => changePage(offset + PAGE_SIZE)}
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
