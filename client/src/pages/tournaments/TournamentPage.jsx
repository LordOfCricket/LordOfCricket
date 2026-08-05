import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, CalendarRange, Users2, ListOrdered } from 'lucide-react'
import { useTournamentDetail } from '../../hooks/useTournamentDetail.js'
import { useAuth } from '../../hooks/useAuth.js'
import { formatLabel, statusLabel, stageLabel, formatDateRange, formatMatchDateTime, nrrDisplay } from '../../models/tournament.model.js'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'
import BracketView from '../../components/tournaments/BracketView.jsx'
import OrganizerPanel from '../../components/tournaments/OrganizerPanel.jsx'

const TABS_BASE = ['Overview', 'Fixtures', 'Results', 'Teams', 'Statistics']

function FixtureRow({ fixture }) {
  const hasResult = fixture.matchStatus === 'finalized'
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{stageLabel(fixture)}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">
          {fixture.teamA.name} vs {fixture.teamB.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{formatMatchDateTime(fixture.matchDate)}</p>
        {hasResult && fixture.resultText && <p className="mt-1 text-xs font-medium text-emerald-200">{fixture.resultText}</p>}
        {fixture.awaitingResolution && <p className="mt-1 text-xs font-semibold text-amber-300">Tie-break required</p>}
      </div>
      {fixture.matchId && (
        <Link
          to={`/matches/${fixture.matchId}/summary`}
          className="shrink-0 self-start rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 sm:self-center"
        >
          {hasResult ? 'View Scorecard' : fixture.matchStatus === 'live' ? 'Watch Live' : 'View Match'}
        </Link>
      )}
    </div>
  )
}

function StandingsTable({ rows, title }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {title && <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2 text-center">P</th>
              <th className="py-2 pr-2 text-center">W</th>
              <th className="py-2 pr-2 text-center">L</th>
              <th className="py-2 pr-2 text-center">T</th>
              <th className="py-2 pr-2 text-center">NR</th>
              <th className="py-2 pr-2 text-center">Pts</th>
              <th className="py-2 pr-2 text-center">NRR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamId} className="border-t border-white/5 text-slate-200">
                <td className="py-2 pr-2 font-semibold text-slate-400">{r.position}</td>
                <td className="py-2 pr-2 font-semibold text-white">
                  <Link to={`/teams/${r.teamId}`} className="hover:text-emerald-300">
                    {r.teamName}
                  </Link>
                </td>
                <td className="py-2 pr-2 text-center">{r.played}</td>
                <td className="py-2 pr-2 text-center">{r.won}</td>
                <td className="py-2 pr-2 text-center">{r.lost}</td>
                <td className="py-2 pr-2 text-center">{r.tied}</td>
                <td className="py-2 pr-2 text-center">{r.noResult}</td>
                <td className="py-2 pr-2 text-center font-bold text-emerald-300">{r.points}</td>
                <td className="py-2 pr-2 text-center">{nrrDisplay(r.nrr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TournamentPage() {
  const { publicTournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const detail = useTournamentDetail(publicTournamentId)
  const [tab, setTab] = useState('Overview')

  const { tournament, teams, squad, fixtures, standings, statistics, loading, error } = detail
  const isStaff = user?.role === 'staff'
  const showBracket = tournament && tournament.format !== 'LEAGUE'
  const showStandings = tournament && tournament.format !== 'KNOCKOUT'
  const tabs = [...TABS_BASE.slice(0, 2), ...(showStandings ? ['Standings'] : []), ...(showBracket ? ['Bracket'] : []), ...TABS_BASE.slice(2)]

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300">
        <p>Loading tournament…</p>
      </main>
    )
  }
  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16">
        <div className="mx-auto max-w-xl">
          <StatsErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      </main>
    )
  }

  const fixturesUpcoming = fixtures.filter((f) => f.matchStatus !== 'finalized')
  const fixturesResults = fixtures.filter((f) => f.matchStatus === 'finalized')

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.88), rgba(2,6,23,0.88)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => navigate('/tournaments')} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          All Tournaments
        </button>

        {/* Hero */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{formatLabel(tournament.format)}</p>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{tournament.name}</h1>
              {tournament.description && <p className="mt-2 max-w-xl text-sm text-slate-300">{tournament.description}</p>}
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-200">{statusLabel(tournament.status)}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              {formatDateRange(tournament.startDate, tournament.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users2 className="h-4 w-4 text-slate-400" />
              {teams.length}/{tournament.maxTeams} teams
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListOrdered className="h-4 w-4 text-slate-400" />
              {tournament.oversPerInnings} overs
            </span>
          </div>

          {tournament.status === 'COMPLETED' && tournament.championTeamName && (
            <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <Trophy className="h-6 w-6 text-amber-300" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">Champion</p>
                <Link to={`/teams/${tournament.championTeamId}`} className="text-lg font-bold text-white hover:text-amber-200">
                  {tournament.championTeamName}
                </Link>
              </div>
            </div>
          )}
        </div>

        {isStaff && <OrganizerPanel detail={detail} />}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                tab === t ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'Overview' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white">Next Up</h3>
                {fixturesUpcoming.length === 0 && <p className="mt-2 text-sm text-slate-400">No upcoming fixtures.</p>}
                <div className="mt-3 flex flex-col gap-2">
                  {fixturesUpcoming.slice(0, 3).map((f) => (
                    <FixtureRow key={f.id} fixture={f} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white">Recent Results</h3>
                {fixturesResults.length === 0 && <p className="mt-2 text-sm text-slate-400">No results yet.</p>}
                <div className="mt-3 flex flex-col gap-2">
                  {fixturesResults.slice(-3).reverse().map((f) => (
                    <FixtureRow key={f.id} fixture={f} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'Fixtures' && (
            <div className="flex flex-col gap-2">
              {fixturesUpcoming.length === 0 && <p className="text-sm text-slate-400">No upcoming fixtures.</p>}
              {fixturesUpcoming.map((f) => (
                <FixtureRow key={f.id} fixture={f} />
              ))}
            </div>
          )}

          {tab === 'Results' && (
            <div className="flex flex-col gap-2">
              {fixturesResults.length === 0 && <p className="text-sm text-slate-400">No results yet.</p>}
              {fixturesResults.map((f) => (
                <FixtureRow key={f.id} fixture={f} />
              ))}
            </div>
          )}

          {tab === 'Standings' && showStandings && (
            <div className="flex flex-col gap-4">
              {standings?.overall && <StandingsTable rows={standings.overall} />}
              {standings?.groupA && <StandingsTable rows={standings.groupA} title="Group A" />}
              {standings?.groupB && <StandingsTable rows={standings.groupB} title="Group B" />}
              {!standings && <p className="text-sm text-slate-400">Standings will appear once fixtures are generated.</p>}
            </div>
          )}

          {tab === 'Bracket' && showBracket && <BracketView fixtures={fixtures} />}

          {tab === 'Teams' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teams.length === 0 && <p className="text-sm text-slate-400">No teams registered yet.</p>}
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <Link to={`/teams/${t.teamId}`} className="font-semibold text-white hover:text-emerald-300">
                      {t.teamName}
                    </Link>
                    {t.groupName && <p className="text-xs text-slate-400">Group {t.groupName}</p>}
                  </div>
                  <p className="text-xs text-slate-400">{squad.filter((s) => s.tournamentTeamId === t.id).length} players</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Statistics' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white">Top Run Scorers</h3>
                {(!statistics || statistics.topRunScorers.length === 0) && <p className="mt-2 text-sm text-slate-400">No batting data yet.</p>}
                <ol className="mt-3 flex flex-col gap-2">
                  {statistics?.topRunScorers.map((p, i) => (
                    <li key={p.player.publicPlayerId} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">
                        {i + 1}.{' '}
                        <Link to={`/players/${p.player.publicPlayerId}`} className="font-semibold hover:text-emerald-300">
                          {p.player.name}
                        </Link>
                      </span>
                      <span className="font-bold text-emerald-300">{p.runs} runs</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white">Top Wicket Takers</h3>
                {(!statistics || statistics.topWicketTakers.length === 0) && <p className="mt-2 text-sm text-slate-400">No bowling data yet.</p>}
                <ol className="mt-3 flex flex-col gap-2">
                  {statistics?.topWicketTakers.map((p, i) => (
                    <li key={p.player.publicPlayerId} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">
                        {i + 1}.{' '}
                        <Link to={`/players/${p.player.publicPlayerId}`} className="font-semibold hover:text-emerald-300">
                          {p.player.name}
                        </Link>
                      </span>
                      <span className="font-bold text-emerald-300">{p.wickets} wkts</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
