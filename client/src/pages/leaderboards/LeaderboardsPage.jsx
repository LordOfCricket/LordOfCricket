import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { fetchLeaderboard } from '../../services/statisticsApi.js'
import { fetchTeams } from '../../services/playerApi.js'
import { PLAYING_ROLE_LABELS } from '../../models/player.model.js'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import LeaderboardPodium from '../../components/leaderboards/LeaderboardPodium.jsx'
import LeaderboardRow from '../../components/leaderboards/LeaderboardRow.jsx'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'

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
  useEffect(() => {
    document.title = 'Leaderboards — Lord Of Cricket'
  }, [])

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
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-32 pb-20 lg:px-10">
        {/* Page Title */}
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex w-full flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-loc-gold" />
            <h1 className="bg-linear-to-r from-loc-warmwhite to-loc-grass bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              Leaderboards
            </h1>
            <Trophy className="h-8 w-8 text-loc-gold" />
          </div>
          <p className="max-w-2xl text-loc-text2-dark">All-time official rankings, derived from finalized LOC matches.</p>
        </ScrollReveal>

        {/* Cross-links */}
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/records" className="rounded-full bg-loc-stadium px-4 py-2.5 text-xs font-bold uppercase text-loc-warmwhite transition-all hover:bg-loc-stadium-hover">
            Cricket Records →
          </Link>
          <Link to="/leaderboards/umpires" className="rounded-full bg-loc-stadium px-4 py-2.5 text-xs font-bold uppercase text-loc-warmwhite transition-all hover:bg-loc-stadium-hover">
            Top Umpires →
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-full border border-loc-gold/20 bg-loc-stadium/20 p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectMetric(METRIC_GROUPS[cat][0].key)}
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                category === cat
                  ? 'bg-loc-stadium text-loc-warmwhite shadow-lg shadow-loc-gold/25'
                  : 'text-loc-text2-dark hover:bg-loc-stadium/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Metric Pills */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {METRIC_GROUPS[category].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => selectMetric(m.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                metric === m.key
                  ? 'bg-loc-gold/20 text-loc-warmwhite'
                  : 'bg-loc-stadium/30 text-loc-text2-dark hover:bg-loc-stadium/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center items-center gap-3">
          <select
            value={role}
            onChange={(e) => changeRole(e.target.value)}
            className="rounded-xl border border-loc-gold/20 bg-white/5 px-3 py-1.5 text-xs text-loc-warmwhite focus:border-loc-gold/50 focus:outline-none transition-colors"
          >
            <option value="" className="bg-loc-dark text-loc-warmwhite">All Roles</option>
            {Object.entries(PLAYING_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-loc-dark text-loc-warmwhite">
                {label}
              </option>
            ))}
          </select>
          <select
            value={teamId}
            onChange={(e) => changeTeam(e.target.value)}
            className="rounded-xl border border-loc-gold/20 bg-white/5 px-3 py-1.5 text-xs text-loc-warmwhite focus:border-loc-gold/50 focus:outline-none transition-colors"
          >
            <option value="" className="bg-loc-dark text-loc-warmwhite">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-loc-dark text-loc-warmwhite">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Leaderboard Content */}
        <div className="rounded-2xl border border-loc-gold/20 bg-loc-stadium/20 p-6 backdrop-blur-sm">
          {loading && <StatsLoadingGrid tiles={6} />}
          {!loading && error && <StatsErrorState message={error} onRetry={load} />}

          {!loading && !error && board && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-loc-warmwhite">{board.title}</h2>
                {board.pagination.total > 0 && <span className="text-xs text-loc-muted-dark">{board.pagination.total} ranked</span>}
              </div>

              {board.qualification && qualificationText(board.qualification) && (
                <p className="mb-4 rounded-xl border border-loc-gold/20 bg-loc-stadium/40 px-3 py-2 text-xs text-loc-gold">
                  {qualificationText(board.qualification)}
                </p>
              )}

              {board.items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-loc-gold/20 bg-loc-stadium/10 px-6 py-16 text-center text-sm text-loc-text2-dark">
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
                <div className="mt-6 flex items-center justify-between gap-4 rounded-full border border-loc-gold/20 bg-loc-stadium/10 px-6 py-4">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}
                    className="rounded-full border border-loc-gold/20 px-4 py-2 text-sm font-semibold text-loc-warmwhite transition-colors hover:bg-loc-stadium/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-loc-text2-dark">
                    #{offset + 1}–#{Math.min(offset + PAGE_SIZE, board.pagination.total)} of {board.pagination.total}
                  </span>
                  <button
                    type="button"
                    disabled={offset + PAGE_SIZE >= board.pagination.total}
                    onClick={() => changePage(offset + PAGE_SIZE)}
                    className="rounded-full border border-loc-gold/20 px-4 py-2 text-sm font-semibold text-loc-warmwhite transition-colors hover:bg-loc-stadium/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
