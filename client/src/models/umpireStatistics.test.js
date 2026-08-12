// Run with: node --test src/models/umpireStatistics.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchesThisMonth, groundsOfficiatedAt } from './umpireStatistics.model.js'

const NOW = new Date('2026-08-12T00:00:00Z')

test('matchesThisMonth counts only ASSIGNED slots whose match falls in the given month', () => {
  const assignments = [
    { status: 'ASSIGNED', match_date: '2026-08-05T18:00:00Z' },
    { status: 'ASSIGNED', match_date: '2026-08-30T10:00:00Z' },
    { status: 'CANCELLED', match_date: '2026-08-10T10:00:00Z' },
    { status: 'ASSIGNED', match_date: '2026-07-31T10:00:00Z' },
  ]
  assert.equal(matchesThisMonth(assignments, NOW), 2)
})

test('matchesThisMonth handles empty/missing input', () => {
  assert.equal(matchesThisMonth([], NOW), 0)
  assert.equal(matchesThisMonth(undefined, NOW), 0)
})

test('groundsOfficiatedAt counts distinct grounds from genuinely completed/finalized ASSIGNED matches only', () => {
  const assignments = [
    { status: 'ASSIGNED', match_status: 'completed', ground_name: 'ABC Ground' },
    { status: 'ASSIGNED', match_status: 'finalized', ground_name: 'ABC Ground' },
    { status: 'ASSIGNED', match_status: 'finalized', ground_name: 'XYZ Ground' },
    { status: 'ASSIGNED', match_status: 'upcoming', ground_name: 'Future Ground' },
    { status: 'CANCELLED', match_status: 'completed', ground_name: 'Cancelled Ground' },
    { status: 'ASSIGNED', match_status: 'completed', ground_name: null },
  ]
  assert.equal(groundsOfficiatedAt(assignments), 2, 'ABC Ground counted once despite two matches, XYZ once; upcoming/cancelled/null excluded')
})

test('groundsOfficiatedAt handles empty/missing input', () => {
  assert.equal(groundsOfficiatedAt([]), 0)
  assert.equal(groundsOfficiatedAt(undefined), 0)
})
