import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groundLocalToUtc, utcToGroundLocalParts, groundDateStr, isValidDateStr } from './timezone.js'

test('groundLocalToUtc: 6pm IST on a given date is 12:30pm UTC (fixed +05:30 offset)', () => {
  const utc = groundLocalToUtc('2026-08-08', 18, 0)
  assert.equal(utc.toISOString(), '2026-08-08T12:30:00.000Z')
})

test('groundLocalToUtc: local midnight rolls back to the previous UTC calendar day', () => {
  const utc = groundLocalToUtc('2026-08-08', 0, 0)
  assert.equal(utc.toISOString(), '2026-08-07T18:30:00.000Z')
})

test('utcToGroundLocalParts / groundDateStr round-trip a known instant correctly regardless of host TZ', () => {
  const utc = new Date('2026-08-08T12:30:00.000Z')
  const parts = utcToGroundLocalParts(utc)
  assert.deepEqual(parts, { year: 2026, month: 8, day: 8, hour: 18, minute: 0 })
  assert.equal(groundDateStr(utc), '2026-08-08')
})

test('utcToGroundLocalParts: an instant just before local midnight reports the earlier calendar day', () => {
  // 2026-08-07T18:29:00Z is 2026-08-07 23:59 IST — still the 7th locally.
  const parts = utcToGroundLocalParts(new Date('2026-08-07T18:29:00.000Z'))
  assert.equal(parts.day, 7)
  assert.equal(parts.hour, 23)
  assert.equal(parts.minute, 59)
})

test('isValidDateStr rejects malformed input, never throws', () => {
  assert.equal(isValidDateStr('2026-08-08'), true)
  assert.equal(isValidDateStr('not-a-date'), false)
  assert.equal(isValidDateStr(''), false)
  assert.equal(isValidDateStr(undefined), false)
  assert.equal(isValidDateStr('2026-13-40'), false)
})
