import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import WagonWheel from '../../components/wagon-wheel/WagonWheel.jsx'
import MatchHeader from '../../components/umpire/MatchHeader.jsx'
import LiveScoreHero from '../../components/umpire/LiveScoreHero.jsx'
import CurrentOverStrip from '../../components/umpire/CurrentOverStrip.jsx'
import BatsmenPanel from '../../components/umpire/BatsmenPanel.jsx'
import BowlerCard from '../../components/umpire/BowlerCard.jsx'
import ScoringPad from '../../components/umpire/ScoringPad.jsx'
import ExtrasSheet from '../../components/umpire/ExtrasSheet.jsx'
import WicketModal from '../../components/umpire/WicketModal.jsx'
import NewBatsmanModal from '../../components/umpire/NewBatsmanModal.jsx'
import WicketsPanel from '../../components/umpire/WicketsPanel.jsx'
import PartnershipCard from '../../components/umpire/PartnershipCard.jsx'
import MatchTimeline from '../../components/umpire/MatchTimeline.jsx'
import CommentaryPanel from '../../components/umpire/CommentaryPanel.jsx'
import UndoBar from '../../components/umpire/UndoBar.jsx'
import MatchControlsMenu from '../../components/umpire/MatchControlsMenu.jsx'
import { useUmpireMatch } from '../../hooks/useUmpireMatch.js'
import { getPlayer } from '../../models/umpireMatch.model.js'
import { selectWagonWheelShots } from '../../models/matchStats.model.js'

export default function UmpireTestingPage() {
  const {
    match,
    matchState,
    innings,
    pendingShot,
    selectShot,
    recordRuns,
    recordWide,
    recordNoBall,
    recordByes,
    recordWicket,
    swapStrike,
    selectNewBatsman,
    selectNewBowler,
    undo,
    endInnings,
    resetMatch,
    canUndo,
    lastDelivery,
  } = useUmpireMatch()

  const [wicketOpen, setWicketOpen] = useState(false)

  const inningsComplete = innings.isAllOut || innings.isOversComplete
  const awaitingSelection = Boolean(innings.pendingBatsmanSelection) || innings.pendingBowlerSelection
  const scoringBlocked = inningsComplete || awaitingSelection

  const wagonWheelShots = selectWagonWheelShots(innings.deliveries)
  const bowler = getPlayer(match, innings.bowlerId)

  return (
    <div className="flex min-h-screen flex-col bg-emerald-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100/70 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold sm:text-base">Umpire Testing</h1>
          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Testing Mode</span>
        </div>
        <MatchControlsMenu canEndInnings={matchState.currentInningsIndex === 0} onEndInnings={endInnings} onResetMatch={resetMatch} />
      </header>

      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-4">
          <MatchHeader match={match} innings={innings} inningsNumber={matchState.currentInningsIndex + 1} />
          <LiveScoreHero innings={innings} oversLimit={match.format.oversPerInnings} />

          {inningsComplete && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {innings.isAllOut ? 'All out!' : 'Overs complete!'} Use Match Controls to end the innings.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <CurrentOverStrip innings={innings} bowlerName={bowler?.name} />

              <div className="mx-auto w-full max-w-xl">
                <div className="aspect-square w-full">
                  <WagonWheel actions={wagonWheelShots} pendingShot={pendingShot} onSelectShot={selectShot} />
                </div>
                <p className="mt-2 min-h-6 text-center text-sm font-semibold text-emerald-200">
                  {pendingShot ? `Selected: ${pendingShot.region}` : 'Tap the ground to set the shot direction'}
                </p>
              </div>

              <PartnershipCard match={match} innings={innings} />
              <MatchTimeline match={match} innings={innings} />
              <CommentaryPanel />
            </div>

            <div className="space-y-4">
              <BatsmenPanel match={match} innings={innings} onSwapStrike={swapStrike} />
              <BowlerCard match={match} innings={innings} onSelectBowler={selectNewBowler} />
              <WicketsPanel match={match} innings={innings} />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-emerald-950/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto max-w-7xl space-y-2">
          {!scoringBlocked && !pendingShot && (
            <p className="text-center text-xs font-medium uppercase tracking-wide text-emerald-100/50">Tap the ground to select a shot direction</p>
          )}
          <ScoringPad disabled={scoringBlocked || !pendingShot} onRuns={recordRuns} />
          <ExtrasSheet
            disabled={scoringBlocked}
            onWide={recordWide}
            onNoBall={recordNoBall}
            onBye={(runs) => recordByes('bye', runs)}
            onLegBye={(runs) => recordByes('leg-bye', runs)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={scoringBlocked}
              onClick={() => setWicketOpen(true)}
              className="min-h-12 rounded-xl border border-rose-400/40 bg-rose-500/20 text-sm font-bold uppercase tracking-wide text-rose-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Wicket
            </button>
            <UndoBar canUndo={canUndo} lastDelivery={lastDelivery} match={match} onUndo={undo} />
          </div>
        </div>
      </div>

      <NewBatsmanModal
        open={Boolean(innings.pendingBatsmanSelection) && !innings.isAllOut}
        match={match}
        innings={innings}
        onSelect={(playerId) => selectNewBatsman(innings.pendingBatsmanSelection, playerId)}
      />
      <WicketModal open={wicketOpen} onClose={() => setWicketOpen(false)} match={match} innings={innings} onConfirm={recordWicket} />
    </div>
  )
}
