// Derived/selector helpers — all pure functions over the state `matchEngine.model.js` produces.
import { DISMISSAL_TYPES } from './umpireMatch.model.js'

const DISMISSAL_LABELS = Object.fromEntries(DISMISSAL_TYPES.map((d) => [d.id, d.label]))

export function dismissalLabel(type) {
  return DISMISSAL_LABELS[type] || type
}

export function formatOvers(legalBalls) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

export function calculateRunRate(runs, legalBalls) {
  if (!legalBalls) return 0
  return runs / (legalBalls / 6)
}

export function getBallsRemaining(oversLimit, legalBalls) {
  return Math.max(0, oversLimit * 6 - legalBalls)
}

export function calculateRequiredRunRate(target, runsScored, ballsRemaining) {
  if (target == null || ballsRemaining <= 0) return null
  const runsNeeded = target - runsScored
  if (runsNeeded <= 0) return 0
  return runsNeeded / (ballsRemaining / 6)
}

export function calculateProjectedScore(runs, legalBalls, oversLimit) {
  if (!legalBalls) return null
  return Math.round((runs / (legalBalls / 6)) * oversLimit)
}

export function getMatchPhase(overNumber, format) {
  const over = overNumber + 1
  if (over <= format.powerplayOvers) return 'Powerplay'
  if (over > format.oversPerInnings - 5) return 'Death Overs'
  return 'Middle Overs'
}

export function getCurrentOverDeliveries(deliveries, overNumber) {
  return deliveries.filter((d) => d.over === overNumber + 1)
}

export function getLast5OversStats(deliveries, currentOverNumber) {
  const fromOver = Math.max(1, currentOverNumber - 4)
  const relevant = deliveries.filter((d) => d.over >= fromOver && d.over <= currentOverNumber + 1 && !d.isDeadBall)
  const runs = relevant.reduce((sum, d) => sum + d.totalRuns, 0)
  const wickets = relevant.filter((d) => d.wicket).length
  const legalBalls = relevant.filter((d) => d.isLegalDelivery).length
  return { runs, wickets, runRate: calculateRunRate(runs, legalBalls) }
}

export function getLastWicket(fallOfWickets) {
  return fallOfWickets.length ? fallOfWickets[fallOfWickets.length - 1] : null
}

/** Adapts enriched delivery records to the flat shape the existing WagonWheel/ShotLines components expect. */
export function selectWagonWheelShots(deliveries) {
  return deliveries
    .filter((d) => d.shot && !d.isDeadBall)
    .map((d) => ({
      id: d.id,
      x: d.shot.x,
      y: d.shot.y,
      region: d.shot.region,
      runs: d.totalRuns,
      outcome: d.wicket ? 'wicket' : 'runs',
    }))
}
