// The only place cricket scoring rules live. Everything here is a pure function:
// a delivery/event log goes in, a derived innings/match state comes out. Undo is
// "drop the last log entry and refold"; edit-last-ball is "patch it and refold" —
// neither needs bespoke inverse-mutation code because nothing here is mutated in place.
//
// v1 scope (documented, not guessed): a no-ball can carry EITHER bat runs OR
// missed-contact byes/leg-byes, never both on the same delivery (the real compound
// case is rare and out of scope for now). A wide never carries byes/leg-byes — all
// wide-adjacent runs are scored as wide runs (Law 22.11). Penalty runs are a
// standalone match event, not attached to a delivery.

import { DISMISSAL_TYPES, BOWLER_CREDITED_DISMISSALS } from './umpireMatch.model.js'

export function createDeliveryEntry(outcome) {
  return { id: crypto.randomUUID(), type: 'delivery', timestamp: new Date(), outcome }
}

export function createEventEntry(event, payload = {}) {
  return { id: crypto.randomUUID(), type: 'event', event, timestamp: new Date(), payload }
}

function emptyBatsmanStat() {
  return { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null }
}

function emptyBowlerStat() {
  return { legalBalls: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noBalls: 0 }
}

function emptyInningsState(battingTeamId, bowlingTeamId) {
  return {
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    ends: { strikerEnd: null, nonStrikerEnd: null },
    bowlerId: null,
    previousOverBowlerId: null,
    isFreeHitNext: false,
    deliveries: [],
    events: [],
    batsmen: {},
    bowlers: {},
    fallOfWickets: [],
    partnership: { runs: 0, balls: 0, batsmen: [] },
    penaltyRunsAwardedToBowlingTeam: 0,
  }
}

function updateBatsman(batsmen, playerId, runsBat, countsAsBallFaced) {
  if (!playerId) return batsmen
  const prev = batsmen[playerId] || emptyBatsmanStat()
  return {
    ...batsmen,
    [playerId]: {
      ...prev,
      runs: prev.runs + runsBat,
      balls: prev.balls + (countsAsBallFaced ? 1 : 0),
      fours: prev.fours + (runsBat === 4 ? 1 : 0),
      sixes: prev.sixes + (runsBat === 6 ? 1 : 0),
    },
  }
}

function updateBowler(bowlers, playerId, runsConceded, countsTowardOver, illegal, isDot) {
  if (!playerId) return bowlers
  const prev = bowlers[playerId] || emptyBowlerStat()
  return {
    ...bowlers,
    [playerId]: {
      ...prev,
      legalBalls: prev.legalBalls + (countsTowardOver ? 1 : 0),
      runs: prev.runs + runsConceded,
      dots: prev.dots + (isDot ? 1 : 0),
      wides: prev.wides + (illegal?.type === 'wide' ? 1 : 0),
      noBalls: prev.noBalls + (illegal?.type === 'no-ball' ? 1 : 0),
    },
  }
}

function buildEnrichedDelivery(state, outcome, meta, derived) {
  return {
    id: meta.id,
    timestamp: meta.timestamp,
    over: Math.floor(state.legalBalls / 6) + 1,
    ball: (state.legalBalls % 6) + 1,
    battingTeamId: state.battingTeamId,
    strikerId: state.ends.strikerEnd,
    nonStrikerId: state.ends.nonStrikerEnd,
    bowlerId: state.bowlerId,
    runsBat: outcome.runsBat || 0,
    illegal: outcome.illegal || null,
    extra: outcome.extra || null,
    wicket: outcome.wicket || null,
    shot: outcome.shot || null,
    isDeadBall: Boolean(outcome.isDeadBall),
    isFreeHit: state.isFreeHitNext,
    isLegalDelivery: derived.legal,
    totalRuns: derived.totalRuns,
  }
}

/** Dismissal types allowed for the delivery about to be recorded. */
export function getAllowedDismissals(inningsState, illegal) {
  if (inningsState.isFreeHitNext) return ['run-out']
  if (illegal?.type === 'wide') return ['run-out', 'stumped', 'obstructing-field', 'hit-ball-twice']
  return DISMISSAL_TYPES.map((d) => d.id)
}

function applyDelivery(state, outcome, meta) {
  if (outcome.isDeadBall) {
    return {
      ...state,
      deliveries: [...state.deliveries, buildEnrichedDelivery(state, outcome, meta, { legal: false, totalRuns: 0 })],
    }
  }

  const illegal = outcome.illegal
  const extra = outcome.extra
  const wicket = outcome.wicket

  const countsTowardOver = !illegal
  const countsAsBallFaced = illegal?.type !== 'wide'

  const runsBat = outcome.runsBat || 0
  // `illegal.runs` is the TOTAL for a wide (flat +1 plus any scampered runs) but a fixed 1
  // for a no-ball (bat/bye runs on a no-ball are tracked separately via runsBat/extra so
  // they aren't double-counted). This split lets a no-ball carry both the flat penalty and
  // bat runs without the two silently overwriting each other.
  const illegalRunRuns = illegal ? illegal.runs - 1 : 0
  const flatPenalty = illegal ? 1 : 0
  const totalRuns = runsBat + illegalRunRuns + flatPenalty + (extra?.runs || 0)
  // Rotation-eligible runs exclude only the flat +1 penalty, which is never "run".
  const runsRun = wicket?.type === 'run-out' ? wicket.runsCompleted || 0 : runsBat + illegalRunRuns + (extra?.runs || 0)

  let next = { ...state, runs: state.runs + totalRuns }
  if (countsTowardOver) next.legalBalls += 1

  const strikerId = state.ends.strikerEnd
  const isCleanDismissal = wicket && wicket.type !== 'run-out'
  next.batsmen = updateBatsman(state.batsmen, strikerId, isCleanDismissal ? 0 : runsBat, countsAsBallFaced)

  if (state.bowlerId) {
    const runsConceded = totalRuns - (extra?.runs || 0)
    const isDot = totalRuns === 0 && !wicket
    next.bowlers = updateBowler(state.bowlers, state.bowlerId, runsConceded, countsTowardOver, illegal, isDot)
  }

  // Rotate for runs run (ends-based, so run-out ordering below is correct by construction).
  next.ends = runsRun % 2 === 1
    ? { strikerEnd: state.ends.nonStrikerEnd, nonStrikerEnd: state.ends.strikerEnd }
    : { ...state.ends }

  if (wicket) {
    next.wickets = state.wickets + 1
    const outId = wicket.type === 'run-out' ? wicket.batsmanOutId : strikerId
    if (outId) {
      const prevStat = next.batsmen[outId] || emptyBatsmanStat()
      next.batsmen = { ...next.batsmen, [outId]: { ...prevStat, out: true, dismissal: wicket } }
      if (next.ends.strikerEnd === outId) next.ends = { ...next.ends, strikerEnd: null }
      else if (next.ends.nonStrikerEnd === outId) next.ends = { ...next.ends, nonStrikerEnd: null }
    }
    if (state.bowlerId && BOWLER_CREDITED_DISMISSALS.includes(wicket.type)) {
      next.bowlers = {
        ...next.bowlers,
        [state.bowlerId]: { ...next.bowlers[state.bowlerId], wickets: (next.bowlers[state.bowlerId]?.wickets || 0) + 1 },
      }
    }
    next.fallOfWickets = [
      ...state.fallOfWickets,
      { wicketNumber: next.wickets, score: next.runs, over: Math.floor(next.legalBalls / 6), ball: next.legalBalls % 6, playerId: outId, dismissal: wicket },
    ]
    next.partnership = { runs: 0, balls: 0, batsmen: [next.ends.strikerEnd, next.ends.nonStrikerEnd].filter(Boolean) }
  } else {
    next.partnership = {
      runs: state.partnership.runs + totalRuns,
      balls: state.partnership.balls + (countsTowardOver ? 1 : 0),
      batsmen: [next.ends.strikerEnd, next.ends.nonStrikerEnd].filter(Boolean),
    }
  }

  next.isFreeHitNext = illegal?.type === 'no-ball' ? true : illegal?.type === 'wide' ? state.isFreeHitNext : false

  if (countsTowardOver && next.legalBalls % 6 === 0 && next.wickets < 10) {
    next.ends = { strikerEnd: next.ends.nonStrikerEnd, nonStrikerEnd: next.ends.strikerEnd }
    next.previousOverBowlerId = state.bowlerId
    next.bowlerId = null
  }

  next.deliveries = [...state.deliveries, buildEnrichedDelivery(state, outcome, meta, { legal: countsTowardOver, totalRuns })]
  return next
}

function applyEvent(state, entry) {
  const { event, payload } = entry
  const eventRecord = { id: entry.id, timestamp: entry.timestamp, event, payload }

  switch (event) {
    case 'batsman-in': {
      const batsmen = state.batsmen[payload.playerId] ? state.batsmen : { ...state.batsmen, [payload.playerId]: emptyBatsmanStat() }
      return { ...state, ends: { ...state.ends, [payload.end]: payload.playerId }, batsmen, events: [...state.events, eventRecord] }
    }
    case 'bowler-change':
      return { ...state, previousOverBowlerId: state.bowlerId, bowlerId: payload.bowlerId, events: [...state.events, eventRecord] }
    case 'strike-swap':
      return { ...state, ends: { strikerEnd: state.ends.nonStrikerEnd, nonStrikerEnd: state.ends.strikerEnd }, events: [...state.events, eventRecord] }
    case 'retire': {
      const outId = payload.playerId
      const prevStat = state.batsmen[outId] || emptyBatsmanStat()
      const ends =
        state.ends.strikerEnd === outId
          ? { ...state.ends, strikerEnd: null }
          : state.ends.nonStrikerEnd === outId
            ? { ...state.ends, nonStrikerEnd: null }
            : state.ends
      return {
        ...state,
        ends,
        batsmen: { ...state.batsmen, [outId]: { ...prevStat, out: true, dismissal: { type: payload.type } } },
        events: [...state.events, eventRecord],
      }
    }
    case 'penalty-runs':
      return {
        ...state,
        runs: payload.awardedTo === 'batting' ? state.runs + payload.runs : state.runs,
        penaltyRunsAwardedToBowlingTeam: payload.awardedTo === 'fielding' ? state.penaltyRunsAwardedToBowlingTeam + payload.runs : state.penaltyRunsAwardedToBowlingTeam,
        events: [...state.events, eventRecord],
      }
    default:
      return { ...state, events: [...state.events, eventRecord] }
  }
}

export function deriveInningsState(log, seed, oversLimit) {
  let state = emptyInningsState(seed.battingTeamId, seed.bowlingTeamId)
  for (const entry of log) {
    state = entry.type === 'delivery' ? applyDelivery(state, entry.outcome, { id: entry.id, timestamp: entry.timestamp }) : applyEvent(state, entry)
  }

  return {
    ...state,
    overNumber: Math.floor(state.legalBalls / 6),
    ballInOver: state.legalBalls % 6,
    pendingBatsmanSelection: !state.ends.strikerEnd ? 'strikerEnd' : !state.ends.nonStrikerEnd ? 'nonStrikerEnd' : null,
    pendingBowlerSelection: !state.bowlerId,
    isAllOut: state.wickets >= 10,
    isOversComplete: oversLimit != null && state.legalBalls >= oversLimit * 6,
  }
}

export function deriveMatchState(match) {
  const innings = []
  for (let i = 0; i < match.innings.length; i++) {
    const raw = match.innings[i]
    const derived = deriveInningsState(raw.log, raw, match.format.oversPerInnings)
    innings.push({ ...derived, target: i > 0 ? innings[i - 1].runs + 1 : null })
  }

  return { ...match, innings, currentInnings: innings[match.currentInningsIndex] }
}
