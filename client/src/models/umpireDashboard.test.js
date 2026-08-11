// Run with: node --test src/models/umpireDashboard.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slotSummary, bucketAssignments, canCancelAssignment, canEnterScoring, applyErrorMessage, cancelErrorMessage } from './umpireDashboard.model.js'

test('slotSummary derives open capacity from total/filled, never negative', () => {
  assert.deepEqual(slotSummary({ total_slots: 2, filled_slots: 0 }), { total: 2, filled: 0, open: 2 })
  assert.deepEqual(slotSummary({ total_slots: 2, filled_slots: 2 }), { total: 2, filled: 2, open: 0 })
  assert.deepEqual(slotSummary({ total_slots: 1, filled_slots: 2 }), { total: 1, filled: 2, open: 0 }, 'never a negative open count')
  assert.deepEqual(slotSummary({}), { total: 0, filled: 0, open: 0 })
  assert.deepEqual(slotSummary(null), { total: 0, filled: 0, open: 0 })
})

test('bucketAssignments sorts ASSIGNED slots by match status, ignores non-ASSIGNED slots', () => {
  const assignments = [
    { status: 'ASSIGNED', match_status: 'upcoming', match_id: 1 },
    { status: 'ASSIGNED', match_status: 'live', match_id: 2 },
    { status: 'ASSIGNED', match_status: 'completed', match_id: 3 },
    { status: 'ASSIGNED', match_status: 'finalized', match_id: 4 },
    { status: 'CANCELLED', match_status: 'upcoming', match_id: 5 },
  ]
  const { upcoming, live, completed } = bucketAssignments(assignments)
  assert.deepEqual(upcoming.map((a) => a.match_id), [1])
  assert.deepEqual(live.map((a) => a.match_id), [2])
  assert.deepEqual(completed.map((a) => a.match_id), [3, 4])
})

test('bucketAssignments handles empty/missing input without throwing', () => {
  assert.deepEqual(bucketAssignments([]), { upcoming: [], live: [], completed: [] })
  assert.deepEqual(bucketAssignments(undefined), { upcoming: [], live: [], completed: [] })
})

test('canCancelAssignment: only an ASSIGNED slot on an upcoming match', () => {
  assert.equal(canCancelAssignment({ status: 'ASSIGNED', match_status: 'upcoming' }), true)
  assert.equal(canCancelAssignment({ status: 'ASSIGNED', match_status: 'live' }), false, 'U3.1: self-cancel is upcoming-only')
  assert.equal(canCancelAssignment({ status: 'ASSIGNED', match_status: 'completed' }), false)
  assert.equal(canCancelAssignment({ status: 'CANCELLED', match_status: 'upcoming' }), false)
  assert.equal(canCancelAssignment(null), false)
})

test('canEnterScoring: only an ASSIGNED slot on a live match', () => {
  assert.equal(canEnterScoring({ status: 'ASSIGNED', match_status: 'live' }), true)
  assert.equal(canEnterScoring({ status: 'ASSIGNED', match_status: 'upcoming' }), false)
  assert.equal(canEnterScoring({ status: 'ASSIGNED', match_status: 'completed' }), false)
  assert.equal(canEnterScoring({ status: 'CANCELLED', match_status: 'live' }), false)
})

test('applyErrorMessage translates every backend code, falls back gracefully for an unknown one', () => {
  assert.equal(applyErrorMessage('NO_SLOT_AVAILABLE'), 'This umpire slot was just filled by another umpire.')
  assert.equal(applyErrorMessage('ALREADY_ASSIGNED'), "You're already assigned to umpire this match.")
  assert.equal(applyErrorMessage('MATCH_NOT_ELIGIBLE'), 'This match is no longer accepting umpire applications.')
  assert.equal(applyErrorMessage('NOT_APPROVED_UMPIRE'), 'Your umpire approval is no longer active.')
  assert.equal(applyErrorMessage('MATCH_NOT_FOUND'), 'This match no longer exists.')
  assert.equal(applyErrorMessage('SOMETHING_NEW', 'server said x'), 'server said x')
  assert.equal(applyErrorMessage('SOMETHING_NEW'), 'Unable to apply for this match.')
})

test('cancelErrorMessage translates every backend code, falls back gracefully for an unknown one', () => {
  assert.equal(cancelErrorMessage('MATCH_NOT_ELIGIBLE'), 'This match is no longer eligible for cancellation.')
  assert.equal(cancelErrorMessage('ASSIGNMENT_NOT_FOUND'), "You don't have an active assignment for this match.")
  assert.equal(cancelErrorMessage('MATCH_NOT_FOUND'), 'This match no longer exists.')
  assert.equal(cancelErrorMessage('SOMETHING_NEW', 'server said x'), 'server said x')
  assert.equal(cancelErrorMessage('SOMETHING_NEW'), 'Unable to cancel this assignment.')
})
