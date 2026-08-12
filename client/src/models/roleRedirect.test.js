// Run with: node --test src/models/roleRedirect.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPostAuthPath, getPostLoginPath } from './roleRedirect.model.js'

test('getPostLoginPath: no user goes to /login', () => {
  assert.equal(getPostLoginPath(null), '/login')
  assert.equal(getPostLoginPath(undefined), '/login')
})

test('getPostLoginPath: role=user (mandatory role selection not yet done) still goes to /role-select', () => {
  assert.equal(getPostLoginPath({ role: 'user' }), '/role-select')
})

test('getPostLoginPath: a player without player_type (mandatory step not yet done) still goes to /player-type', () => {
  assert.equal(getPostLoginPath({ role: 'player', player_type: null }), '/player-type')
})

test('getPostLoginPath: a fully set-up team player lands on the homepage', () => {
  assert.equal(getPostLoginPath({ role: 'player', player_type: 'team_player' }), '/')
})

test('getPostLoginPath: a fully set-up approved umpire lands on the homepage, never /umpire directly', () => {
  assert.equal(getPostLoginPath({ role: 'player', player_type: 'umpire' }), '/')
})

test('getPostLoginPath: staff, any sub-role, lands on the homepage', () => {
  assert.equal(getPostLoginPath({ role: 'staff', staff_role: 'super_admin' }), '/')
  assert.equal(getPostLoginPath({ role: 'staff', staff_role: 'admin' }), '/')
  assert.equal(getPostLoginPath({ role: 'staff', staff_role: 'canteen_staff' }), '/')
  assert.equal(getPostLoginPath({ role: 'staff', staff_role: null }), '/')
})

// getPostAuthPath itself must stay exactly as it was — RequireStaffRole.jsx's
// unauthorized-fallback and CanteenEntryRedirect.jsx's role dispatcher both
// still depend on its real dashboard-specific destinations, not '/'.
test('getPostAuthPath is unchanged: still returns role-specific dashboards, not the homepage', () => {
  assert.equal(getPostAuthPath({ role: 'player', player_type: 'team_player' }), '/player/dashboard')
  assert.equal(getPostAuthPath({ role: 'player', player_type: 'umpire' }), '/umpire')
  assert.equal(getPostAuthPath({ role: 'staff', staff_role: 'super_admin' }), '/admin/dashboard')
  assert.equal(getPostAuthPath({ role: 'staff', staff_role: 'canteen_staff' }), '/canteen/staff')
  assert.equal(getPostAuthPath({ role: 'player', player_type: null }), '/player-type')
  assert.equal(getPostAuthPath({ role: 'user' }), '/role-select')
  assert.equal(getPostAuthPath(null), '/login')
})
