import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMatchSummary } from '../../hooks/useMatchSummary.js'
import { StatsLoadingGrid, StatsErrorState } from '../../components/stats/StatsStates.jsx'
import MatchHero from '../../components/match-summary/MatchHero.jsx'
import InningsTabs from '../../components/match-summary/InningsTabs.jsx'
import BattingScorecard from '../../components/match-summary/BattingScorecard.jsx'
import BowlingScorecard from '../../components/match-summary/BowlingScorecard.jsx'
import FallOfWicketsPanel from '../../components/match-summary/FallOfWicketsPanel.jsx'
import PartnershipsPanel from '../../components/match-summary/PartnershipsPanel.jsx'
import WagonWheelSection from '../../components/match-summary/WagonWheelSection.jsx'
import OversPanel from '../../components/match-summary/OversPanel.jsx'
import MatchTimelinePanel from '../../components/match-summary/MatchTimelinePanel.jsx'
import MatchInfoPanel from '../../components/match-summary/MatchInfoPanel.jsx'

const TABS = [
  { key: 'scorecard', label: 'Scorecard' },
  { key: 'overs', label: 'Overs' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'info', label: 'Info' },
]

function requiredRunRateLabel(chase) {
  if (!chase) return null
  return `Need ${chase.runsNeeded}${chase.ballsRemaining != null ? ` from ${chase.ballsRemaining} balls` : ''}${
    chase.requiredRunRate != null ? ` (RRR ${chase.requiredRunRate.toFixed(2)})` : ''
  }`
}

export default function MatchSummaryPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { summary, loading, error, retry } = useMatchSummary(matchId)

  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'scorecard'

  // Derived directly from the URL + loaded data on every render — no
  // separate state/effect needed (and no synchronous setState-in-effect):
  // default to the latest innings whenever the URL doesn't name a valid one.
  const inningsFromUrl = Number(searchParams.get('innings'))
  const activeInningsId =
    summary && summary.innings.some((i) => i.inningsId === inningsFromUrl) ? inningsFromUrl : summary?.innings[summary.innings.length - 1]?.inningsId ?? null

  const selectTab = (key) => setSearchParams((prev) => ({ ...Object.fromEntries(prev), tab: key }), { replace: true })
  const selectInnings = (id) => setSearchParams((prev) => ({ ...Object.fromEntries(prev), innings: String(id) }), { replace: true })

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <StatsLoadingGrid tiles={4} />
        </div>
      </main>
    )
  }

  if (error || !summary) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-emerald-950 px-4 text-center text-white">
        <StatsErrorState message={error} onRetry={retry} />
        <button type="button" onClick={() => navigate('/')} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          Back to Home
        </button>
      </main>
    )
  }

  const activeInnings = summary.innings.find((i) => i.inningsId === activeInningsId) || summary.innings[summary.innings.length - 1] || null

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

        <div className="mt-4 space-y-4">
          <MatchHero summary={summary} />

          {summary.innings.length === 0 ? (
            <MatchInfoPanel summary={summary} />
          ) : (
            <>
              <InningsTabs summary={summary} activeInningsId={activeInnings?.inningsId} onSelect={selectInnings} />

              {activeInnings?.chase && (
                <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
                  Target {activeInnings.target} · {requiredRunRateLabel(activeInnings.chase)}
                </div>
              )}

              <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-900/50 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => selectTab(t.key)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                      tab === t.key ? 'bg-emerald-500 text-emerald-950' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeInnings && (
                <div className="space-y-4">
                  {tab === 'scorecard' && (
                    <>
                      <BattingScorecard innings={activeInnings} />
                      <FallOfWicketsPanel innings={activeInnings} />
                      <BowlingScorecard innings={activeInnings} />
                      <PartnershipsPanel innings={activeInnings} />
                      <WagonWheelSection innings={activeInnings} />
                    </>
                  )}
                  {tab === 'overs' && <OversPanel innings={activeInnings} />}
                  {tab === 'timeline' && <MatchTimelinePanel innings={activeInnings} />}
                  {tab === 'info' && <MatchInfoPanel summary={summary} />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
