import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchPublicPlayerInfo } from '../../services/statisticsApi.js'
import { useCareerStats } from '../../hooks/useCareerStats.js'
import Avatar from '../../components/ui/Avatar.jsx'
import { roleLabel, battingStyleLabel, bowlingStyleLabel, statPriorityForRole } from '../../models/player.model.js'
import { StatsLoadingGrid, StatsErrorState, StatsEmptyState } from '../../components/stats/StatsStates.jsx'
import BattingStatsPanel from '../../components/stats/BattingStatsPanel.jsx'
import BowlingStatsPanel from '../../components/stats/BowlingStatsPanel.jsx'
import FieldingStatsPanel from '../../components/stats/FieldingStatsPanel.jsx'
import MatchHistoryPanel from '../../components/stats/MatchHistoryPanel.jsx'
import RecentFormStrip from '../../components/stats/RecentFormStrip.jsx'

const TABS = ['OVERVIEW', 'BATTING', 'BOWLING', 'FIELDING', 'MATCHES']

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}

function OverviewPanels({ role, matches, batting, bowling }) {
  const primary = statPriorityForRole(role)[0]
  const bowlingFirst = primary === 'wickets' || primary === 'economy'
  const panels = [
    <div key="batting">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Batting</p>
      <BattingStatsPanel matches={matches} batting={batting} />
    </div>,
    <div key="bowling">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bowling</p>
      <BowlingStatsPanel bowling={bowling} />
    </div>,
  ]
  return <div className="space-y-6">{bowlingFirst ? panels.slice().reverse() : panels}</div>
}

/**
 * The PUBLIC cricket profile — distinct from ProfilePage.jsx (the private
 * self-profile, which reads from useAuth() and includes Edit Profile /
 * Settings access). This page only ever fetches the narrow public-safe
 * player projection (GET /players/:publicPlayerId) plus the same official
 * career stats endpoint every player-stats surface uses — never account,
 * canteen, or auth data.
 */
export default function PublicPlayerProfilePage() {
  const { publicPlayerId } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [playerLoading, setPlayerLoading] = useState(true)
  const [playerError, setPlayerError] = useState(null)
  const [tab, setTab] = useState('OVERVIEW')
  const { stats, loading, error, retry, loadMoreMatchHistory } = useCareerStats(publicPlayerId)

  useEffect(() => {
    document.title = 'Lord Of Cricket'
  }, [])

  useEffect(() => {
    fetchPublicPlayerInfo(publicPlayerId)
      .then((p) => {
        setPlayer(p)
        setPlayerError(null)
        document.title = `${p.name} — Lord Of Cricket`
      })
      .catch((err) => setPlayerError(err.response?.data?.message || "Couldn't load this player."))
      .finally(() => setPlayerLoading(false))
  }, [publicPlayerId])

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 py-10 text-white sm:px-6 lg:px-8"
      style={{ backgroundImage: `linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.78)), url('/images/cricket-stadium.jpg')` }}
    >
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {playerLoading && <div className="mt-6"><StatsLoadingGrid tiles={4} /></div>}
        {!playerLoading && playerError && (
          <div className="mt-6">
            <StatsErrorState message={playerError} onRetry={() => window.location.reload()} />
          </div>
        )}

        {!playerLoading && !playerError && player && (
          <>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <div className="flex items-center gap-5">
                <Avatar name={player.name} photoUrl={player.photoUrl} size="lg" />
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{player.name}</h1>
                  <p className="mt-1 text-sm font-semibold text-emerald-300">{player.publicPlayerId}</p>
                  <p className="text-sm text-slate-300">{roleLabel(player.role) || 'Playing role not set'}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Batting Style" value={battingStyleLabel(player.battingStyle)} />
                <Field label="Bowling Style" value={bowlingStyleLabel(player.bowlingStyle)} />
                <Field label="Jersey Number" value={player.jerseyNumber != null ? `#${player.jerseyNumber}` : null} />
                <Field label="Team" value={player.team?.name} />
              </div>

              {player.bio && <p className="mt-6 text-sm text-slate-300">{player.bio}</p>}
            </div>

            <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-900/50 p-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-colors ${
                    tab === t ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
              {loading && <StatsLoadingGrid tiles={tab === 'FIELDING' ? 3 : 8} />}
              {!loading && error && <StatsErrorState message={error} onRetry={retry} />}
              {!loading && !error && stats && stats.career.matches === 0 && (
                <StatsEmptyState label={tab === 'OVERVIEW' ? `${player.name}'s career overview` : `${player.name}'s ${tab.toLowerCase()} statistics`} />
              )}
              {!loading && !error && stats && stats.career.matches > 0 && (
                <>
                  {tab === 'OVERVIEW' && (
                    <div className="space-y-6">
                      <OverviewPanels role={player.role} matches={stats.career.matches} batting={stats.career.batting} bowling={stats.career.bowling} />
                      {stats.recentForm.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recent Form</p>
                          <RecentFormStrip performances={stats.recentForm} onOpenMatch={(matchId) => navigate(`/matches/${matchId}/setup`)} />
                        </div>
                      )}
                    </div>
                  )}
                  {tab === 'BATTING' && <BattingStatsPanel matches={stats.career.matches} batting={stats.career.batting} />}
                  {tab === 'BOWLING' && <BowlingStatsPanel bowling={stats.career.bowling} />}
                  {tab === 'FIELDING' && <FieldingStatsPanel fielding={stats.career.fielding} />}
                  {tab === 'MATCHES' && <MatchHistoryPanel matchHistory={stats.matchHistory} onLoadMore={loadMoreMatchHistory} />}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
