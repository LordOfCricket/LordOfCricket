import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Medal } from 'lucide-react'
import { fetchCricketRecords } from '../../services/statisticsApi.js'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import ScrollReveal from '../../components/common/ScrollReveal.jsx'
import { fadeUpSoft } from '../../lib/revealVariants.js'

function recordDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function TeamName({ team }) {
  if (!team) return <span className="text-loc-text2-dark">—</span>
  return (
    <Link to={`/teams/${team.id}`} className="font-semibold text-loc-warmwhite hover:text-loc-gold">
      {team.name}
    </Link>
  )
}

/** One record category = a titled card with a short ranked list. */
function RecordCard({ title, subtitle, rows, emptyText, renderRow }) {
  return (
    <div className="rounded-2xl border border-loc-gold/20 bg-loc-stadium/20 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-loc-warmwhite">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-loc-text2-dark">{subtitle}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-loc-gold/20 bg-loc-stadium/10 px-4 py-8 text-center text-xs text-loc-text2-dark">
          {emptyText}
        </p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-white/5">
          {rows.map((row, i) => (
            <li key={`${row.matchId}-${i}`} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 w-5 shrink-0 text-center text-xs font-bold text-loc-gold">{i + 1}</span>
              <div className="min-w-0 flex-1">{renderRow(row)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function MatchLink({ matchId, children }) {
  return (
    <Link to={`/matches/${matchId}/summary`} className="text-xs text-loc-text2-dark hover:text-loc-gold">
      {children}
    </Link>
  )
}

export default function RecordsPage() {
  useEffect(() => {
    document.title = 'Cricket Records — Lord Of Cricket'
  }, [])

  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    return fetchCricketRecords()
      .then((data) => {
        setRecords(data)
        setError(null)
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load records."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-32 pb-20 lg:px-10">
        <ScrollReveal variant={fadeUpSoft} amount={0.4} className="flex w-full flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <Medal className="h-8 w-8 text-loc-gold" />
            <h1 className="bg-linear-to-r from-loc-warmwhite to-loc-grass bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              Cricket Records
            </h1>
            <Medal className="h-8 w-8 text-loc-gold" />
          </div>
          <p className="max-w-2xl text-loc-text2-dark">
            All-time match &amp; team records, derived from finalized LOC matches. For individual batting and bowling records, see the{' '}
            <Link to="/leaderboards" className="font-semibold text-loc-gold hover:underline">
              Leaderboards
            </Link>
            .
          </p>
        </ScrollReveal>

        <div className="flex justify-center">
          <Link
            to="/leaderboards"
            className="inline-flex items-center gap-2 rounded-full bg-loc-stadium px-4 py-2.5 text-xs font-bold uppercase text-loc-warmwhite transition-all hover:bg-loc-stadium-hover"
          >
            <Trophy className="h-3.5 w-3.5" />
            Player Leaderboards →
          </Link>
        </div>

        {loading && <StatsLoadingGrid tiles={6} />}
        {!loading && error && <StatsErrorState message={error} onRetry={load} />}

        {!loading && !error && records && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecordCard
              title="Highest Team Total"
              subtitle="Most runs by a team in a single innings"
              rows={records.highestTeamTotals}
              emptyText="No finalized innings yet."
              renderRow={(r) => (
                <>
                  <p className="text-sm">
                    <span className="font-bold text-loc-gold">
                      {r.runs}/{r.wickets}
                    </span>{' '}
                    — <TeamName team={r.team} /> <span className="text-loc-text2-dark">vs {r.opponent?.name || '—'}</span>
                  </p>
                  <MatchLink matchId={r.matchId}>{recordDate(r.matchDate)} · View scorecard</MatchLink>
                </>
              )}
            />

            <RecordCard
              title="Highest Match Aggregate"
              subtitle="Most combined runs across both innings of a match"
              rows={records.highestMatchAggregates}
              emptyText="No finalized matches yet."
              renderRow={(r) => (
                <>
                  <p className="text-sm">
                    <span className="font-bold text-loc-gold">{r.totalRuns}</span> runs —{' '}
                    <TeamName team={r.teamA} /> <span className="text-loc-text2-dark">v</span> <TeamName team={r.teamB} />
                  </p>
                  <MatchLink matchId={r.matchId}>{recordDate(r.matchDate)} · View scorecard</MatchLink>
                </>
              )}
            />

            <RecordCard
              title="Biggest Win by Runs"
              subtitle="Largest margin of victory batting first"
              rows={records.biggestWinsByRuns}
              emptyText="No matches decided by a runs margin yet."
              renderRow={(r) => (
                <>
                  <p className="text-sm">
                    <span className="font-bold text-loc-gold">{r.margin} runs</span> — <TeamName team={r.winner} />{' '}
                    <span className="text-loc-text2-dark">beat {r.loser?.name || '—'}</span>
                  </p>
                  <MatchLink matchId={r.matchId}>{recordDate(r.matchDate)} · View scorecard</MatchLink>
                </>
              )}
            />

            <RecordCard
              title="Biggest Win by Wickets"
              subtitle="Largest margin of victory chasing"
              rows={records.biggestWinsByWickets}
              emptyText="No matches decided by a wickets margin yet."
              renderRow={(r) => (
                <>
                  <p className="text-sm">
                    <span className="font-bold text-loc-gold">{r.margin} wickets</span> — <TeamName team={r.winner} />{' '}
                    <span className="text-loc-text2-dark">beat {r.loser?.name || '—'}</span>
                  </p>
                  <MatchLink matchId={r.matchId}>{recordDate(r.matchDate)} · View scorecard</MatchLink>
                </>
              )}
            />

            <RecordCard
              title="Highest Successful Chase"
              subtitle="Most runs scored batting second in a win"
              rows={records.highestSuccessfulChases}
              emptyText="No successful chases yet."
              renderRow={(r) => (
                <>
                  <p className="text-sm">
                    <span className="font-bold text-loc-gold">
                      {r.runs}/{r.wickets}
                    </span>{' '}
                    — <TeamName team={r.chaser} /> <span className="text-loc-text2-dark">chased down {r.defender?.name || '—'}</span>
                  </p>
                  <MatchLink matchId={r.matchId}>{recordDate(r.matchDate)} · View scorecard</MatchLink>
                </>
              )}
            />
          </div>
        )}
      </main>
    </div>
  )
}
