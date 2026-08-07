import { useMemo, useReducer, useState } from 'react'
import { createInitialMatch } from '../models/umpireMatch.model.js'
import { createDeliveryEntry, createEventEntry, correctEntry, previewCorrection, deriveMatchState } from '../models/matchEngine.model.js'

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
    // Single primitive for every historical correction (runs, extra, wicket, striker, bowler,
    // shot, voiding an event) — patches the entry AND appends the audit record in one dispatch
    // so they can never desync.
    case 'CORRECT_ENTRY':
      return {
        ...match,
        innings: match.innings.map((inn, idx) => {
          if (idx !== match.currentInningsIndex) return inn
          const index = inn.log.findIndex((e) => e.id === action.entryId)
          if (index === -1) return inn

          const original = inn.log[index]
          const beforeSource = original.type === 'delivery' ? original.outcome : original.payload
          const before = Object.fromEntries(Object.keys(action.patch).map((k) => [k, beforeSource[k]]))
          const log = inn.log.slice()
          log[index] = correctEntry(original, action.patch)

          const correction = { id: crypto.randomUUID(), entryId: action.entryId, before, after: action.patch, reason: action.reason || null, correctedAt: new Date() }
          return { ...inn, log, corrections: [...inn.corrections, correction] }
        }),
      }
    // Appends an inverse correction rather than popping — the audit trail stays intact even
    // for reverted edits. Only ever targets the single most recent correction globally, since
    // that's the only one guaranteed not-stale relative to any later edit of the same entry.
    case 'UNDO_CORRECTION':
      return {
        ...match,
        innings: match.innings.map((inn, idx) => {
          if (idx !== match.currentInningsIndex || inn.corrections.length === 0) return inn
          const last = inn.corrections[inn.corrections.length - 1]
          const index = inn.log.findIndex((e) => e.id === last.entryId)
          if (index === -1) return inn // dangling — Undo Last Ball already walked back past it

          const log = inn.log.slice()
          log[index] = correctEntry(log[index], last.before)
          const revert = { id: crypto.randomUUID(), entryId: last.entryId, before: last.after, after: last.before, reason: 'Reverted correction', correctedAt: new Date() }
          return { ...inn, log, corrections: [...inn.corrections, revert] }
        }),
      }
    case 'END_INNINGS': {
      const prev = match.innings[match.currentInningsIndex]
      return {
        ...match,
        innings: [...match.innings, { battingTeamId: prev.bowlingTeamId, bowlingTeamId: prev.battingTeamId, log: [], corrections: [] }],
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

  // Generic escape hatch for non-scoring events (catch dropped, appeal, review, fielding
  // events) that only need to land in the timeline — no dedicated engine rule to enforce.
  const recordEvent = (eventName, payload) => push(createEventEntry(eventName, payload))

  const swapStrike = () => push(createEventEntry('strike-swap'))
  const selectNewBatsman = (end, playerId) => push(createEventEntry('batsman-in', { end, playerId }))
  const selectNewBowler = (bowlerId) => push(createEventEntry('bowler-change', { bowlerId }))
  const recordRetirement = (playerId, type) => push(createEventEntry('retire', { playerId, type }))
  const recordPenalty = (runs, awardedTo) => push(createEventEntry('penalty-runs', { runs, awardedTo }))

  const undo = () => dispatch({ type: 'UNDO' })
  const endInnings = () => dispatch({ type: 'END_INNINGS' })
  const resetMatch = () => dispatch({ type: 'RESET', match: createInitialMatch() })

  // Historical correction: patches ANY past entry (delivery or event) by id and replays. This
  // is deliberately the same primitive whether the scorer is fixing runs, a wicket, the
  // striker, or a bowler-change event — see matchEngine.model.js's `correctEntry`.
  const correctHistoricalEntry = (entryId, patch, reason) => dispatch({ type: 'CORRECT_ENTRY', entryId, patch, reason })
  const undoLastCorrection = () => dispatch({ type: 'UNDO_CORRECTION' })

  const currentRawInnings = match.innings[match.currentInningsIndex]
  const currentLog = currentRawInnings.log
  const lastEntry = currentLog.length ? currentLog[currentLog.length - 1] : null
  const lastDelivery = lastEntry?.type === 'delivery' ? matchState.currentInnings.deliveries[matchState.currentInnings.deliveries.length - 1] : null

  const corrections = currentRawInnings.corrections
  const canUndoCorrection = corrections.length > 0 && currentLog.some((e) => e.id === corrections[corrections.length - 1].entryId)

  // Folds the log twice (current vs. hypothetically-patched) so the correction UI can show an
  // impact preview before committing — cheap at this scale, see matchEngine.model.js.
  const getCorrectionPreview = (entryId, patch) => previewCorrection(currentLog, currentRawInnings, match.format.oversPerInnings, entryId, patch)

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
    recordEvent,
    swapStrike,
    selectNewBatsman,
    selectNewBowler,
    recordRetirement,
    recordPenalty,
    undo,
    endInnings,
    resetMatch,
    canUndo: currentLog.length > 0,
    lastDelivery,
    correctHistoricalEntry,
    undoLastCorrection,
    canUndoCorrection,
    corrections,
    getCorrectionPreview,
  }
}
