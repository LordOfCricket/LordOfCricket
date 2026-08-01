import { useMemo, useReducer, useState } from 'react'
import { createInitialMatch } from '../models/umpireMatch.model.js'
import { createDeliveryEntry, createEventEntry, deriveMatchState } from '../models/matchEngine.model.js'

// Dumb reducer: only manipulates the log array. All cricket knowledge lives in
// matchEngine.model.js, applied via `deriveMatchState` (see the useMemo below).
function matchReducer(match, action) {
  switch (action.type) {
    case 'PUSH':
      return {
        ...match,
        innings: match.innings.map((inn, idx) =>
          idx === match.currentInningsIndex ? { ...inn, log: [...inn.log, action.entry] } : inn
        ),
      }
    case 'UNDO':
      return {
        ...match,
        innings: match.innings.map((inn, idx) =>
          idx === match.currentInningsIndex ? { ...inn, log: inn.log.slice(0, -1) } : inn
        ),
      }
    case 'EDIT_LAST':
      return {
        ...match,
        innings: match.innings.map((inn, idx) => {
          if (idx !== match.currentInningsIndex || inn.log.length === 0) return inn
          const log = inn.log.slice()
          const last = log[log.length - 1]
          log[log.length - 1] = { ...last, outcome: { ...last.outcome, ...action.patch } }
          return { ...inn, log }
        }),
      }
    case 'END_INNINGS': {
      const prev = match.innings[match.currentInningsIndex]
      return {
        ...match,
        innings: [...match.innings, { battingTeamId: prev.bowlingTeamId, bowlingTeamId: prev.battingTeamId, log: [] }],
        currentInningsIndex: match.innings.length,
      }
    }
    case 'RESET':
      return action.match
    default:
      return match
  }
}

export function useUmpireMatch() {
  const [match, dispatch] = useReducer(matchReducer, undefined, createInitialMatch)
  const [pendingShot, setPendingShot] = useState(null)

  const matchState = useMemo(() => deriveMatchState(match), [match])

  const push = (entry) => dispatch({ type: 'PUSH', entry })

  // WagonWheel already resolves the tap into a shot via wagonWheel.model.js's resolveShot
  // before calling this — the hook just stores whatever it's handed.
  const selectShot = (shot) => setPendingShot(shot)

  const consumeShot = () => {
    const shot = pendingShot
    setPendingShot(null)
    return shot
  }

  const recordRuns = (runs) => {
    push(createDeliveryEntry({ runsBat: runs, illegal: null, extra: null, wicket: null, shot: consumeShot(), isDeadBall: false }))
  }

  const recordWide = (additionalRuns = 0) => {
    // A wide isn't attributed to a wagon-wheel shot, but any pending selection is still
    // cleared so a stale dashed line doesn't linger into the next delivery.
    consumeShot()
    push(createDeliveryEntry({ runsBat: 0, illegal: { type: 'wide', runs: 1 + additionalRuns }, extra: null, wicket: null, shot: null, isDeadBall: false }))
  }

  const recordNoBall = (batRuns = 0) => {
    push(createDeliveryEntry({ runsBat: batRuns, illegal: { type: 'no-ball', runs: 1 }, extra: null, wicket: null, shot: consumeShot(), isDeadBall: false }))
  }

  const recordByes = (type, runs) => {
    push(createDeliveryEntry({ runsBat: 0, illegal: null, extra: { type, runs }, wicket: null, shot: consumeShot(), isDeadBall: false }))
  }

  const recordWicket = (wicket) => {
    const runsBat = wicket.type === 'run-out' ? wicket.runsCompleted || 0 : 0
    push(createDeliveryEntry({ runsBat, illegal: null, extra: null, wicket, shot: consumeShot(), isDeadBall: false }))
  }

  const recordDeadBall = () => {
    consumeShot()
    push(createDeliveryEntry({ runsBat: 0, illegal: null, extra: null, wicket: null, shot: null, isDeadBall: true }))
  }

  const swapStrike = () => push(createEventEntry('strike-swap'))
  const selectNewBatsman = (end, playerId) => push(createEventEntry('batsman-in', { end, playerId }))
  const selectNewBowler = (bowlerId) => push(createEventEntry('bowler-change', { bowlerId }))
  const recordRetirement = (playerId, type) => push(createEventEntry('retire', { playerId, type }))
  const recordPenalty = (runs, awardedTo) => push(createEventEntry('penalty-runs', { runs, awardedTo }))

  const undo = () => dispatch({ type: 'UNDO' })
  const editLastDelivery = (patch) => dispatch({ type: 'EDIT_LAST', patch })
  const endInnings = () => dispatch({ type: 'END_INNINGS' })
  const resetMatch = () => dispatch({ type: 'RESET', match: createInitialMatch() })

  const currentLog = match.innings[match.currentInningsIndex].log
  const lastEntry = currentLog.length ? currentLog[currentLog.length - 1] : null
  const lastDelivery = lastEntry?.type === 'delivery' ? matchState.currentInnings.deliveries[matchState.currentInnings.deliveries.length - 1] : null

  return {
    match,
    matchState,
    innings: matchState.currentInnings,
    pendingShot,
    selectShot,
    clearShot: () => setPendingShot(null),
    recordRuns,
    recordWide,
    recordNoBall,
    recordByes,
    recordWicket,
    recordDeadBall,
    swapStrike,
    selectNewBatsman,
    selectNewBowler,
    recordRetirement,
    recordPenalty,
    undo,
    editLastDelivery,
    endInnings,
    resetMatch,
    canUndo: currentLog.length > 0,
    lastDelivery,
  }
}
