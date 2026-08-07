import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveDisplayStatus, isValidStatusTransition } from './bookingStatus.js'

test('deriveDisplayStatus: a cancelled booking is always CANCELLED regardless of time', () => {
  const booking = { status: 'CANCELLED', end_time: '2099-01-01T00:00:00Z' }
  assert.equal(deriveDisplayStatus(booking, new Date('2000-01-01')), 'CANCELLED')
})

test('deriveDisplayStatus: a confirmed booking whose slot is still in the future is APPROVED', () => {
  const booking = { status: 'CONFIRMED', end_time: '2099-01-01T00:00:00Z' }
  assert.equal(deriveDisplayStatus(booking, new Date('2020-01-01')), 'APPROVED')
})

test('deriveDisplayStatus: a confirmed booking whose slot has already ended is COMPLETED', () => {
  const booking = { status: 'CONFIRMED', end_time: '2000-01-01T00:00:00Z' }
  assert.equal(deriveDisplayStatus(booking, new Date('2020-01-01')), 'COMPLETED')
})

test('deriveDisplayStatus: exactly at end_time counts as COMPLETED (half-open, matches EXCLUDE constraint semantics)', () => {
  const booking = { status: 'CONFIRMED', end_time: '2020-01-01T10:00:00Z' }
  assert.equal(deriveDisplayStatus(booking, new Date('2020-01-01T10:00:00Z')), 'COMPLETED')
})

test('isValidStatusTransition: CONFIRMED -> CANCELLED is valid', () => {
  assert.equal(isValidStatusTransition('CONFIRMED', 'CANCELLED'), true)
})

test('isValidStatusTransition: CANCELLED -> anything is invalid, never resurrected', () => {
  assert.equal(isValidStatusTransition('CANCELLED', 'CONFIRMED'), false)
  assert.equal(isValidStatusTransition('CANCELLED', 'CANCELLED'), false)
})

test('isValidStatusTransition: unknown states are invalid, never a crash', () => {
  assert.equal(isValidStatusTransition('BOGUS', 'CANCELLED'), false)
})
