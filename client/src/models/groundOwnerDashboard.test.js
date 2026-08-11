// Run with: node --test src/models/groundOwnerDashboard.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slotStatusInfo, filterUpcomingMatches, describeSlot } from './groundOwnerDashboard.model.js'

test('slotStatusInfo: 0 total slots is distinct from "needs umpires"', () => {
  assert.deepEqual(slotStatusInfo({ total_slots: 0, filled_slots: 0 }), { emoji: '⚪', label: 'No umpire slots configured' })
})

test('slotStatusInfo: 0/N filled is "Needs Umpires"', () => {
  assert.deepEqual(slotStatusInfo({ total_slots: 2, filled_slots: 0 }), { emoji: '🔴', label: 'Needs Umpires' })
})

test('slotStatusInfo: partially filled shows remaining open count', () => {
  assert.deepEqual(slotStatusInfo({ total_slots: 2, filled_slots: 1 }), { emoji: '🟡', label: '1 Slot Available' })
  assert.deepEqual(slotStatusInfo({ total_slots: 4, filled_slots: 1 }), { emoji: '🟡', label: '3 Slots Available' })
})

test('slotStatusInfo: fully filled is "Fulfilled"', () => {
  assert.deepEqual(slotStatusInfo({ total_slots: 2, filled_slots: 2 }), { emoji: '🟢', label: 'Fulfilled' })
})

test('slotStatusInfo: also accepts the "my grounds" aggregate field names', () => {
  assert.deepEqual(slotStatusInfo({ umpireSlotsTotal: 2, umpireSlotsFilled: 2 }), { emoji: '🟢', label: 'Fulfilled' })
})

test('slotStatusInfo: handles missing/null input without throwing', () => {
  assert.deepEqual(slotStatusInfo({}), { emoji: '⚪', label: 'No umpire slots configured' })
  assert.deepEqual(slotStatusInfo(null), { emoji: '⚪', label: 'No umpire slots configured' })
})

test('filterUpcomingMatches keeps only status=upcoming', () => {
  const matches = [{ status: 'upcoming', id: 1 }, { status: 'live', id: 2 }, { status: 'completed', id: 3 }, { status: 'finalized', id: 4 }]
  assert.deepEqual(filterUpcomingMatches(matches).map((m) => m.id), [1])
  assert.deepEqual(filterUpcomingMatches([]), [])
  assert.deepEqual(filterUpcomingMatches(undefined), [])
})

test('describeSlot: an assigned slot shows the real umpire name, never a placeholder', () => {
  assert.deepEqual(describeSlot({ status: 'ASSIGNED', umpire_name: 'Rahul Sharma' }), { label: 'Rahul Sharma', detail: 'Assigned' })
})

test('describeSlot: an open slot is honestly labeled, not left blank', () => {
  assert.deepEqual(describeSlot({ status: 'AVAILABLE', umpire_name: null }), { label: 'Slot Available', detail: null })
  assert.deepEqual(describeSlot({ status: 'CANCELLED', umpire_name: null }), { label: 'Slot Available', detail: null })
})
