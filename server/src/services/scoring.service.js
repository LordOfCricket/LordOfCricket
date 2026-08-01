// Orchestrates the authoritative scoring flow: PostgreSQL repository loads
// context -> pure domain replay/validate -> PostgreSQL repository persists.
// This is the ONLY place that opens the scoring transaction — controllers
// never touch `pool`/`client` directly, and the domain layer (replay.js,
// validate.js) never imports `pg`.

import { pool } from '../config/db.js'
import { replayInnings } from '../domain/scoring/replay.js'
import { validateDeliveryInput, validateEventInput } from '../domain/scoring/validate.js'
import { ScoringError, SCORING_ERROR_CODES as CODES } from '../domain/scoring/errors.js'
import * as inningsRepo from '../repositories/innings.repository.js'
import * as deliveryRepo from '../repositories/delivery.repository.js'
import * as matchEventRepo from '../repositories/matchEvent.repository.js'
import * as wicketRepo from '../repositories/wicket.repository.js'
import * as wagonWheelRepo from '../repositories/wagonWheel.repository.js'
import * as matchPlayerRepo from '../repositories/matchPlayer.repository.js'

// Exported so correction.service.js (Phase 4) reuses exactly the same format/
// seed resolution instead of a second copy that could drift.
export async function loadFormat(matchId, client = pool) {
  const { rows } = await client.query('SELECT overs_per_innings, balls_per_over, rules FROM matches WHERE id = $1', [matchId])
  const m = rows[0]
  if (!m) throw new ScoringError(CODES.INVALID_INNINGS_STATE, 'Match not found.', { matchId })
  return {
    oversPerInnings: m.overs_per_innings ?? null,
    ballsPerOver: m.balls_per_over ?? 6,
    powerplayOvers: m.rules?.powerplayOvers,
  }
}

export function seedFrom(innings) {
  return { battingTeamId: innings.batting_team_id, bowlingTeamId: innings.bowling_team_id }
}

export async function createInnings({ matchId, inningsNumber, battingTeamId, bowlingTeamId }) {
  return inningsRepo.createInnings({ matchId, inningsNumber, battingTeamId, bowlingTeamId })
}

export async function addMatchPlayer(params) {
  return matchPlayerRepo.createMatchPlayer(params)
}

export async function listMatchPlayers(matchId) {
  return matchPlayerRepo.listMatchPlayers(matchId)
}

/** Load + replay an innings from PostgreSQL with no reliance on any server
 * memory — the "server restart never loses the ability to reconstruct the
 * innings" acceptance criterion, exercised on literally every read. */
export async function getInningsState(inningsId) {
  const innings = await inningsRepo.findInningsById(inningsId)
  if (!innings) return null
  const format = await loadFormat(innings.match_id)
  const log = await inningsRepo.loadInningsLog(inningsId)
  const state = replayInnings(log, seedFrom(innings), format)
  return { innings, state, format }
}

export async function listInningsDeliveries(inningsId) {
  return deliveryRepo.listDeliveriesByInnings(inningsId)
}

export async function listInningsEvents(inningsId) {
  return matchEventRepo.listMatchEventsByInnings(inningsId)
}

export async function listWagonWheelShots(inningsId) {
  return wagonWheelRepo.listShotsByInnings(inningsId)
}

/**
 * Records one delivery inside a single transaction:
 *  lock innings -> idempotency check -> version check -> load+replay existing
 *  log -> validate -> assign log_sequence + bump version -> insert delivery
 *  (+ wicket + wagon-wheel-shot) -> replay again including the new entry ->
 *  write back every derived/cache column -> commit.
 *
 * `expectedVersion` answers "was the scorer acting on current state?".
 * `clientActionId` answers "have I already processed this exact submission?"
 * — checked first and independent of the version check, so a network retry of
 * an already-applied action is a safe no-op even if the innings has since moved on.
 */
export async function recordDelivery({ inningsId, expectedVersion, clientActionId, recordedByUserId, input }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const innings = await inningsRepo.lockInningsForUpdate(client, inningsId)
    if (!innings) throw new ScoringError(CODES.INVALID_INNINGS_STATE, 'Innings not found.', { inningsId })

    if (clientActionId) {
      const existing = await deliveryRepo.findDeliveryByClientActionId(client, inningsId, clientActionId)
      if (existing) {
        await client.query('ROLLBACK')
        return { delivery: existing, idempotentReplay: true, version: innings.version }
      }
    }

    if (expectedVersion != null && innings.version !== expectedVersion) {
      throw new ScoringError(CODES.VERSION_CONFLICT, `Innings has moved to version ${innings.version}; client expected ${expectedVersion}.`, {
        currentVersion: innings.version,
        expectedVersion,
      })
    }

    const format = await loadFormat(innings.match_id, client)
    const matchPlayersById = await matchPlayerRepo.getMatchPlayersMap(innings.match_id, client)
    const existingLog = await inningsRepo.loadInningsLog(inningsId, client)
    const seed = seedFrom(innings)
    const stateBefore = replayInnings(existingLog, seed, format)

    validateDeliveryInput({
      input,
      state: stateBefore,
      matchPlayersById,
      battingTeamId: innings.batting_team_id,
      bowlingTeamId: innings.bowling_team_id,
      inningsStatus: innings.status,
    })

    const logSequence = await inningsRepo.claimNextLogSequence(client, inningsId)
    const bumped = await inningsRepo.bumpVersion(client, inningsId, innings.version)
    if (bumped == null) {
      throw new ScoringError(CODES.VERSION_CONFLICT, 'Innings version changed unexpectedly during recording.', { inningsId })
    }

    const deliveryRow = await deliveryRepo.insertDelivery(client, { inningsId, logSequence, recordedByUserId, clientActionId, input })

    // Replay BEFORE inserting the wicket row: for every dismissal type except
    // run-out, dismissed_match_player_id is derived (= the striker replay
    // computes for this delivery), not scorer input, and the column is
    // NOT NULL — so it has to be known at insert time, not patched in after.
    const newEntry = { kind: 'delivery', id: String(deliveryRow.id), logSequence, ...input, wicket: input.wicket || null }
    const stateAfter = replayInnings([...existingLog, newEntry], seed, format)
    const enrichedDelivery = stateAfter.deliveries[stateAfter.deliveries.length - 1]

    if (input.wicket) {
      const dismissedMatchPlayerId =
        input.wicket.type === 'run-out' ? input.wicket.dismissedMatchPlayerId : enrichedDelivery.strikerMatchPlayerId
      await wicketRepo.insertWicket(client, deliveryRow.id, { ...input.wicket, dismissedMatchPlayerId })
    }
    if (input.shot) {
      await wagonWheelRepo.insertShot(client, deliveryRow.id, input.shot)
    }

    await deliveryRepo.updateDeliveryDerivedFields(client, deliveryRow.id, enrichedDelivery)

    await inningsRepo.updateInningsCache(client, inningsId, {
      runs: stateAfter.runs,
      wickets: stateAfter.wickets,
      legalBalls: stateAfter.legalBalls,
      strikerMatchPlayerId: stateAfter.ends.strikerEnd,
      nonStrikerMatchPlayerId: stateAfter.ends.nonStrikerEnd,
      bowlerMatchPlayerId: enrichedDelivery.bowlerMatchPlayerId,
      isFreeHitNext: stateAfter.isFreeHitNext,
    })

    await client.query('COMMIT')
    return { delivery: { ...deliveryRow, ...enrichedDelivery }, state: stateAfter, version: bumped }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/** Same shape as recordDelivery, for non-delivery match events (batsman-in,
 * bowler-change, retire, penalty-runs, catch-dropped, appeal, review, ...). */
export async function recordEvent({ inningsId, expectedVersion, clientActionId, event }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const innings = await inningsRepo.lockInningsForUpdate(client, inningsId)
    if (!innings) throw new ScoringError(CODES.INVALID_INNINGS_STATE, 'Innings not found.', { inningsId })

    if (clientActionId) {
      const existing = await matchEventRepo.findMatchEventByClientActionId(client, inningsId, clientActionId)
      if (existing) {
        await client.query('ROLLBACK')
        return { event: existing, idempotentReplay: true, version: innings.version }
      }
    }

    if (expectedVersion != null && innings.version !== expectedVersion) {
      throw new ScoringError(CODES.VERSION_CONFLICT, `Innings has moved to version ${innings.version}; client expected ${expectedVersion}.`, {
        currentVersion: innings.version,
        expectedVersion,
      })
    }

    const format = await loadFormat(innings.match_id, client)
    const matchPlayersById = await matchPlayerRepo.getMatchPlayersMap(innings.match_id, client)
    const existingLog = await inningsRepo.loadInningsLog(inningsId, client)
    const seed = seedFrom(innings)
    const stateBefore = replayInnings(existingLog, seed, format)

    validateEventInput({
      event,
      state: stateBefore,
      matchPlayersById,
      battingTeamId: innings.batting_team_id,
      bowlingTeamId: innings.bowling_team_id,
      inningsStatus: innings.status,
    })

    const logSequence = await inningsRepo.claimNextLogSequence(client, inningsId)
    const bumped = await inningsRepo.bumpVersion(client, inningsId, innings.version)
    if (bumped == null) {
      throw new ScoringError(CODES.VERSION_CONFLICT, 'Innings version changed unexpectedly during recording.', { inningsId })
    }

    const eventRow = await matchEventRepo.insertMatchEvent(client, {
      inningsId,
      deliveryId: event.deliveryId ?? null,
      logSequence,
      clientActionId,
      eventType: event.eventType,
      payload: event.payload || {},
    })

    const newEntry = { kind: 'event', id: String(eventRow.id), logSequence, eventType: event.eventType, payload: event.payload || {}, voided: false }
    const stateAfter = replayInnings([...existingLog, newEntry], seed, format)
    const lastDelivery = stateAfter.deliveries[stateAfter.deliveries.length - 1]

    await inningsRepo.updateInningsCache(client, inningsId, {
      runs: stateAfter.runs,
      wickets: stateAfter.wickets,
      legalBalls: stateAfter.legalBalls,
      strikerMatchPlayerId: stateAfter.ends.strikerEnd,
      nonStrikerMatchPlayerId: stateAfter.ends.nonStrikerEnd,
      bowlerMatchPlayerId: lastDelivery ? lastDelivery.bowlerMatchPlayerId : null,
      isFreeHitNext: stateAfter.isFreeHitNext,
    })

    await client.query('COMMIT')
    return { event: eventRow, state: stateAfter, version: bumped }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
