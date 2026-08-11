// Run with: node --test src/models/groundDiscovery.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasValue, formatGroundAddress } from './groundDiscovery.model.js'

test('hasValue rejects null/undefined/empty/whitespace-only, accepts real content', () => {
  assert.equal(hasValue(null), false)
  assert.equal(hasValue(undefined), false)
  assert.equal(hasValue(''), false)
  assert.equal(hasValue('   '), false)
  assert.equal(hasValue('Delhi'), true)
  assert.equal(hasValue(0), true, '0 is a real value, not "missing"')
})

test('formatGroundAddress joins only present parts, in order, with no dangling separators', () => {
  assert.equal(
    formatGroundAddress({ addressLine: '221B Baker St', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' }),
    '221B Baker St, Delhi, Delhi, 110001, India',
  )
  assert.equal(formatGroundAddress({ addressLine: null, city: 'Delhi', state: null, postalCode: null, country: 'India' }), 'Delhi, India')
  assert.equal(formatGroundAddress(null), '')
  assert.equal(formatGroundAddress({}), '')
})
