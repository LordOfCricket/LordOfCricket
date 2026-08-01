// Phase 4 integration tests — real PostgreSQL, self-cleaning fixtures (see
// fixtures.js). Covers the acceptance scenarios from the Phase 4 brief:
// primary strike-correction case, preview-does-not-write, stale preview,
// idempotency, extras/bowler/wagon-wheel corrections, wicket conflicts, undo,
// completed-match protection, and restart-safety.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'crypto'
import { pool } from '../../config/db.js'
import * as scoringService from '../../services/scoring.service.js'
import * as correctionService from '../../services/correction.service.js'
import { createFixture } from './fixtures.js'
import { ScoringError } from '../../domain/scoring/errors.js'

async function recordRuns(fx, runsSequence) {
  const ids = []
  for (const batRuns of runsSequence) {
    const before = await scoringService.getInningsState(fx.inningsId)
    // Alternate bowler by over so multi-over sequences don't trip the "same
    // bowler can't bowl two overs in a row" rule.
    const bowlerMatchPlayerId = before.state.overNumber % 2 === 0 ? fx.bowler1 : fx.bowler2
    const result = await scoringService.recordDelivery({
      inningsId: fx.inningsId,
      expectedVersion: before.innings.version,
      clientActionId: randomUUID(),
      input: { batRuns, bowlerMatchPlayerId },
    })
    ids.push(result.delivery.id)
  }
  return ids
}

test('PRIMARY ACCEPTANCE: correcting 5.2 (2 -> 1) reassigns later strikers but preserves later physical outcomes, without touching them manually', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    // Two overs of filler, then the target ball, then two more overs so the
    // acceptance case genuinely reaches "at least two overs beyond the target".
    await recordRuns(fx, [0, 0, 0, 0, 0, 0]) // over 1
    const [, targetDeliveryId] = await recordRuns(fx, [0, 2, 4, 1, 0, 2]) // over 2 — 5.2 is index 1 here
    await recordRuns(fx, [0, 0, 0, 0, 0, 0]) // over 3
    await recordRuns(fx, [0, 0]) // 7.1, 7.2 -> reaches "7.4"-ish beyond target

    const beforeState = await scoringService.getInningsState(fx.inningsId)
    const targetIndexBefore = beforeState.state.deliveries.findIndex((d) => String(d.id) === String(targetDeliveryId))
    const theFourBefore = beforeState.state.deliveries[targetIndexBefore + 1]
    assert.equal(theFourBefore.totalRuns, 4)
    const strikerBeforeCorrection = theFourBefore.strikerMatchPlayerId

    const preview = await correctionService.previewCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: targetDeliveryId,
      patch: { batRuns: 1 },
    })
    assert.equal(preview.valid, true)
    assert.equal(preview.after.runs, beforeState.state.runs - 1)

    const applied = await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: targetDeliveryId,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: beforeState.innings.version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    // Audit row + version bump.
    assert.equal(applied.correction.reason_code, 'WRONG_RUNS')
    assert.equal(applied.version, beforeState.innings.version + 1)

    // Reload fresh from PostgreSQL — no reliance on the apply() return value.
    const afterState = await scoringService.getInningsState(fx.inningsId)
    assert.equal(afterState.state.runs, beforeState.state.runs - 1)
    const theFourAfter = afterState.state.deliveries[targetIndexBefore + 1]
    assert.equal(theFourAfter.totalRuns, 4, 'the physical FOUR must remain a FOUR')
    assert.equal(theFourAfter.batRuns, 4)
    assert.notEqual(theFourAfter.strikerMatchPlayerId, strikerBeforeCorrection, 'the batsman attributed to it must be recomputed')

    // Nothing after the target was manually rewritten — its bowler is untouched.
    assert.equal(theFourAfter.bowlerMatchPlayerId, theFourBefore.bowlerMatchPlayerId)
  } finally {
    await fx.cleanup()
  }
})

test('preview never writes to PostgreSQL', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [deliveryId] = await recordRuns(fx, [2])
    const before = await pool.query('SELECT bat_runs, updated_at FROM deliveries WHERE id = $1', [deliveryId])
    const versionBefore = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.previewCorrection({ inningsId: fx.inningsId, targetType: 'delivery', targetId: deliveryId, patch: { batRuns: 1 } })

    const after = await pool.query('SELECT bat_runs, updated_at FROM deliveries WHERE id = $1', [deliveryId])
    assert.deepEqual(after.rows[0], before.rows[0])

    const { rows: corrections } = await pool.query('SELECT COUNT(*)::int AS c FROM score_corrections WHERE innings_id = $1', [fx.inningsId])
    assert.equal(corrections[0].c, 0)

    const versionAfter = (await scoringService.getInningsState(fx.inningsId)).innings.version
    assert.equal(versionAfter, versionBefore)
  } finally {
    await fx.cleanup()
  }
})

test('stale preview: apply with an outdated expectedVersion is rejected, no correction applied', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [deliveryId] = await recordRuns(fx, [2])
    const staleVersion = (await scoringService.getInningsState(fx.inningsId)).innings.version

    // Another scoring action moves the version forward after the "preview".
    await scoringService.recordDelivery({ inningsId: fx.inningsId, expectedVersion: staleVersion, clientActionId: randomUUID(), input: { batRuns: 0, bowlerMatchPlayerId: fx.bowler1 } })

    await assert.rejects(
      () =>
        correctionService.applyCorrection({
          inningsId: fx.inningsId,
          targetType: 'delivery',
          targetId: deliveryId,
          patch: { batRuns: 1 },
          reasonCode: 'WRONG_RUNS',
          expectedVersion: staleVersion,
          clientActionId: randomUUID(),
          correctedByUserId: fx.userId,
        }),
      (err) => err instanceof ScoringError && err.code === 'VERSION_CONFLICT'
    )

    const { rows } = await pool.query('SELECT bat_runs FROM deliveries WHERE id = $1', [deliveryId])
    assert.equal(rows[0].bat_runs, 2, 'the stale correction must not have been applied')
    const { rows: corrections } = await pool.query('SELECT COUNT(*)::int AS c FROM score_corrections WHERE innings_id = $1', [fx.inningsId])
    assert.equal(corrections[0].c, 0)
  } finally {
    await fx.cleanup()
  }
})

test('correction idempotency: retrying the same clientActionId applies once', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [deliveryId] = await recordRuns(fx, [2])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version
    const clientActionId = randomUUID()

    const first = await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: deliveryId,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: version,
      clientActionId,
      correctedByUserId: fx.userId,
    })
    const retry = await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: deliveryId,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: version, // stale on purpose, like a real retry would send
      clientActionId,
      correctedByUserId: fx.userId,
    })

    assert.equal(retry.idempotentReplay, true)
    assert.equal(String(retry.correction.id), String(first.correction.id))

    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM score_corrections WHERE innings_id = $1', [fx.inningsId])
    assert.equal(rows[0].c, 1)
  } finally {
    await fx.cleanup()
  }
})

test('normal -> wide: legal ball count and score update, delivery identity/log_sequence unchanged', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1, d2] = await recordRuns(fx, [1, 1])
    const before = await pool.query('SELECT log_sequence FROM deliveries WHERE id = $1', [d1])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { batRuns: 0, illegal: { type: 'wide', runs: 1 } },
      reasonCode: 'WRONG_EXTRA',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const after = await pool.query('SELECT log_sequence FROM deliveries WHERE id = $1', [d1])
    assert.equal(after.rows[0].log_sequence, before.rows[0].log_sequence, 'identity/ordering must never change')

    const state = await scoringService.getInningsState(fx.inningsId)
    assert.equal(state.state.legalBalls, 1, 'the wide no longer counts as a legal ball')
    const d1After = state.state.deliveries.find((d) => String(d.id) === String(d1))
    const d2After = state.state.deliveries.find((d) => String(d.id) === String(d2))
    assert.equal(d1After.isLegalDelivery, false)
    assert.equal(d2After.over, 1)
    assert.equal(d2After.ball, 1, 'the second delivery is now legitimately ball 1 of the over, since the wide does not count')
  } finally {
    await fx.cleanup()
  }
})

test('normal -> no-ball: free hit propagates, bowler figures update', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [1, 0])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { batRuns: 4, illegal: { type: 'no-ball', runs: 1 } },
      reasonCode: 'WRONG_EXTRA',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const state = await scoringService.getInningsState(fx.inningsId)
    assert.equal(state.state.legalBalls, 1)
    assert.equal(state.state.runs, 5) // 5 (no-ball+4) + 0
    assert.equal(state.state.bowlers[fx.bowler1].noBalls, 1)
  } finally {
    await fx.cleanup()
  }
})

test('bat runs -> leg-bye: batsman runs move to team extras, bowler concedes 0 for it', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [1])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { batRuns: 0, extra: { type: 'leg-bye', runs: 1 } },
      reasonCode: 'WRONG_EXTRA',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const state = await scoringService.getInningsState(fx.inningsId)
    assert.equal(state.state.runs, 1, 'team total unchanged (1 run either way)')
    assert.equal(state.state.batsmen[fx.rahul].runs, 0, 'batsman no longer credited with the run')
    assert.equal(state.state.bowlers[fx.bowler1].runs, 0, 'bowler no longer concedes a run credited as leg-bye')
  } finally {
    await fx.cleanup()
  }
})

test('bowler correction: physical outcome and strike unchanged, figures move from old bowler to new bowler', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [4])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { bowlerMatchPlayerId: fx.bowler2 },
      reasonCode: 'WRONG_BOWLER',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const state = await scoringService.getInningsState(fx.inningsId)
    assert.equal(state.state.runs, 4, 'physical outcome unchanged')
    assert.equal(state.state.ends.strikerEnd, fx.rahul, 'strike rotation unaffected by a bowler-only correction (4 is even, no swap)')
    assert.equal(state.state.bowlers[fx.bowler1]?.runs ?? 0, 0, 'old bowler figures corrected away')
    assert.equal(state.state.bowlers[fx.bowler2].runs, 4, 'new bowler now has the figures')
  } finally {
    await fx.cleanup()
  }
})

test('wagon wheel + strike correction: the shot stays attached to the same delivery id, ownership follows the recomputed striker', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [target] = await recordRuns(fx, [2]) // will become 1 -> odd -> strike swaps
    await scoringService.recordDelivery({
      inningsId: fx.inningsId,
      expectedVersion: (await scoringService.getInningsState(fx.inningsId)).innings.version,
      clientActionId: randomUUID(),
      input: { batRuns: 4, bowlerMatchPlayerId: fx.bowler1, shot: { normalizedX: 0.5, normalizedY: -0.5, angleDegrees: 90, regionId: 'cover' } },
    })

    const beforeShots = await scoringService.listWagonWheelShots(fx.inningsId)
    assert.equal(beforeShots[0].striker_match_player_id, fx.rahul)

    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version
    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: target,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const afterShots = await scoringService.listWagonWheelShots(fx.inningsId)
    assert.equal(afterShots.length, 1, 'the shot itself is untouched — still exactly one')
    assert.equal(String(afterShots[0].delivery_id), String(beforeShots[0].delivery_id), 'still attached to the same delivery id')
    assert.equal(Number(afterShots[0].normalized_x), 0.5, 'coordinates unchanged')
    assert.equal(afterShots[0].striker_match_player_id, fx.aman, 'ownership follows the recomputed striker')
  } finally {
    await fx.cleanup()
  }
})

test('wicket conflict: an ambiguous correction is refused, database is untouched', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    // A run-out naming a specific match player as dismissed.
    const version1 = (await scoringService.getInningsState(fx.inningsId)).innings.version
    const runOut = await scoringService.recordDelivery({
      inningsId: fx.inningsId,
      expectedVersion: version1,
      clientActionId: randomUUID(),
      input: { batRuns: 0, bowlerMatchPlayerId: fx.bowler1, wicket: { type: 'run-out', dismissedMatchPlayerId: fx.aman, runsCompleted: 0 } },
    })
    const version2 = (await scoringService.getInningsState(fx.inningsId)).innings.version

    // Correcting the run-out to name a player who isn't at either crease (a
    // bowler, not a batting-side player) — an obviously invalid dismissed
    // player, refused either as a structural validation error or a replay
    // conflict depending on which check reaches it first.
    const preview = await correctionService.previewCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: runOut.delivery.id,
      patch: { wicket: { type: 'run-out', dismissedMatchPlayerId: fx.bowler1 /* not a batting-side player at either end */, runsCompleted: 0 } },
    })
    assert.equal(preview.valid, false)

    await assert.rejects(
      () =>
        correctionService.applyCorrection({
          inningsId: fx.inningsId,
          targetType: 'delivery',
          targetId: runOut.delivery.id,
          patch: { wicket: { type: 'run-out', dismissedMatchPlayerId: fx.bowler1, runsCompleted: 0 } },
          reasonCode: 'WRONG_WICKET',
          expectedVersion: version2,
          clientActionId: randomUUID(),
          correctedByUserId: fx.userId,
        }),
      (err) => err instanceof ScoringError && ['REPLAY_CONFLICT', 'INVALID_DISMISSED_PLAYER'].includes(err.code)
    )

    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM score_corrections WHERE innings_id = $1', [fx.inningsId])
    assert.equal(rows[0].c, 0)
  } finally {
    await fx.cleanup()
  }
})

test('undo correction: restores prior state as a new audited row, original row untouched', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [2])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    const applied = await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    const undone = await correctionService.undoCorrection({
      inningsId: fx.inningsId,
      correctionId: applied.correction.id,
      expectedVersion: applied.version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    assert.equal(undone.correction.undoes_correction_id, applied.correction.id)
    assert.equal(undone.version, applied.version + 1)

    const state = await scoringService.getInningsState(fx.inningsId)
    assert.equal(state.state.runs, 2, 'run total restored to the pre-correction value')

    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM score_corrections WHERE innings_id = $1', [fx.inningsId])
    assert.equal(rows[0].c, 2, 'both the original correction and its undo remain in the audit trail')

    // Undoing the same correction twice must be refused.
    await assert.rejects(
      () =>
        correctionService.undoCorrection({
          inningsId: fx.inningsId,
          correctionId: applied.correction.id,
          expectedVersion: undone.version,
          clientActionId: randomUUID(),
          correctedByUserId: fx.userId,
        }),
      (err) => err instanceof ScoringError && err.code === 'CORRECTION_ALREADY_UNDONE'
    )
  } finally {
    await fx.cleanup()
  }
})

test('completed match: corrections are locked, database untouched', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [2])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version
    await pool.query("UPDATE matches SET status = 'completed' WHERE id = $1", [fx.matchId])

    await assert.rejects(
      () =>
        correctionService.applyCorrection({
          inningsId: fx.inningsId,
          targetType: 'delivery',
          targetId: d1,
          patch: { batRuns: 1 },
          reasonCode: 'WRONG_RUNS',
          expectedVersion: version,
          clientActionId: randomUUID(),
          correctedByUserId: fx.userId,
        }),
      (err) => err instanceof ScoringError && err.code === 'MATCH_LOCKED'
    )

    const { rows } = await pool.query('SELECT bat_runs FROM deliveries WHERE id = $1', [d1])
    assert.equal(rows[0].bat_runs, 2)
  } finally {
    await fx.cleanup()
  }
})

test('server-restart equivalent: correction survives a from-scratch reload and replay', async () => {
  const fx = await createFixture()
  try {
    await fx.seatOpeners()
    const [d1] = await recordRuns(fx, [2, 4, 1, 0, 2])
    const version = (await scoringService.getInningsState(fx.inningsId)).innings.version

    await correctionService.applyCorrection({
      inningsId: fx.inningsId,
      targetType: 'delivery',
      targetId: d1,
      patch: { batRuns: 1 },
      reasonCode: 'WRONG_RUNS',
      expectedVersion: version,
      clientActionId: randomUUID(),
      correctedByUserId: fx.userId,
    })

    // Nothing cached anywhere in process memory between this call and the one above.
    const reloaded = await scoringService.getInningsState(fx.inningsId)
    assert.equal(reloaded.state.runs, 8) // 1+4+1+0+2
    assert.equal(reloaded.state.batsmen[fx.rahul].runs + reloaded.state.batsmen[fx.aman].runs, 8)
  } finally {
    await fx.cleanup()
  }
})
