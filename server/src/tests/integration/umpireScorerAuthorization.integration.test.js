// Phase 21 (U2, revised U5.1) — closes the gap the Phase 0 audit found:
// player_type='umpire' alone used to be enough to pass requireScorer, even
// though it is set the moment a user REQUESTS umpire status
// (selectPlayerType), before any admin decision. requireScorer must also
// confirm the user's LATEST umpire_requests row is 'approved'.
//
// U5.1 note: this file originally exercised requireScorer through the real
// POST /api/matches route. U5.1 moved match CREATION to
// requireStaffRole('super_admin') only (match.routes.js) — creation and
// scoring are no longer the same permission, and requireScorer itself now
// has zero production routes using it (match-scoped routes use
// requireMatchScorer since U3; only requireScorer's own logic — Gate 1,
// "is this an approved umpire" — is still worth testing directly). So this
// file now mounts requireScorer on a disposable test-only route, exactly
// the pattern groundMembership.integration.test.js already uses for
// requireGroundRole (a real middleware with no single "natural" production
// route to hang the test on). requireScorer itself is unmodified — this is
// a test-harness change, not a behavior change.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import express from 'express'
import { pool } from '../../config/db.js'
import { signToken } from '../../utils/jwt.js'
import { requireAuth, requireScorer } from '../../middlewares/auth.js'

function buildTestApp() {
  const app = express()
  app.get('/test/scorer-only', requireAuth, requireScorer, (req, res) => res.json({ ok: true }))
  return app
}

async function startTestApp() {
  const httpServer = http.createServer(buildTestApp())
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  return {
    baseUrl: `http://localhost:${port}/test`,
    async close() {
      await new Promise((resolve) => httpServer.close(resolve))
    },
  }
}

async function json(url, { token } = {}) {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  return { status: res.status, data: await res.json() }
}

// playerType null|'team_player'|'umpire'; requestStatuses is an ordered list
// of umpire_requests rows to insert (oldest first) so multi-request /
// latest-wins scenarios can be set up directly, independent of the
// selectPlayerType application flow.
async function makeUser({ label, role = 'player', playerType = null, requestStatuses = [], staffRoleName = null }) {
  let staffRoleId = null
  if (staffRoleName) {
    staffRoleId = (await pool.query(`SELECT id FROM staff_roles WHERE name = $1`, [staffRoleName])).rows[0].id
  }
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, player_type, staff_role_id) VALUES ($1,$2,'not-a-real-hash',$3,$4,$5) RETURNING *`,
    [`Integration Test ${label}`, `integration-test-u2-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`, role, playerType, staffRoleId],
  )
  const user = rows[0]

  const requestIds = []
  for (const status of requestStatuses) {
    // decided_at computed in JS, not via `CASE WHEN $2 = ...` in SQL — reusing
    // the same parameter both as the inserted value and inside a CASE
    // comparison makes Postgres deduce two different types for $2
    // (varchar vs text) and reject the query with "inconsistent types
    // deduced for parameter $2" (42P08).
    const decidedAt = status === 'pending' ? null : new Date()
    const { rows: reqRows } = await pool.query(
      `INSERT INTO umpire_requests (user_id, status, decided_at) VALUES ($1, $2, $3) RETURNING id`,
      [user.id, status, decidedAt],
    )
    requestIds.push(reqRows[0].id)
    // Stagger requested_at so "latest" is unambiguous and deterministic —
    // otherwise same-millisecond inserts could tie on ORDER BY requested_at DESC.
    await pool.query(`UPDATE umpire_requests SET requested_at = requested_at + ($2 || ' milliseconds')::interval WHERE id = $1`, [
      reqRows[0].id,
      requestIds.length * 10,
    ])
  }

  return {
    id: user.id,
    token: signToken({ id: user.id, name: user.name }),
    async cleanup() {
      await pool.query('DELETE FROM umpire_requests WHERE user_id = $1', [user.id])
      await pool.query('DELETE FROM users WHERE id = $1', [user.id])
    },
  }
}

test('Case 1 — a PENDING umpire request is NOT an approved umpire: scorer access denied', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'pending', playerType: 'umpire', requestStatuses: ['pending'] })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 2 — an APPROVED umpire request grants scorer access', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'approved', playerType: 'umpire', requestStatuses: ['approved'] })
  try {
    const { status, data } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 200, JSON.stringify(data))
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 3 — a REJECTED umpire request is NOT an approved umpire: scorer access denied', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'rejected', playerType: 'umpire', requestStatuses: ['rejected'] })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 4 — a normal team_player has unchanged behavior: scorer access denied', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'team-player', playerType: 'team_player' })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 5 — super_admin scorer access is unchanged (bypasses the umpire-request check entirely)', async () => {
  const server = await startTestApp()
  const admin = await makeUser({ label: 'super-admin', role: 'staff', staffRoleName: 'super_admin' })
  try {
    const { status, data } = await json(`${server.baseUrl}/scorer-only`, { token: admin.token })
    assert.equal(status, 200, JSON.stringify(data))
  } finally {
    await admin.cleanup()
    await server.close()
  }
})

test('a user with no umpire_requests row at all (never requested) is denied, even with player_type=umpire', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'no-request', playerType: 'umpire', requestStatuses: [] })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 6a — multiple requests: an old APPROVED request followed by a newer REJECTED one denies access (latest wins)', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'approved-then-rejected', playerType: 'umpire', requestStatuses: ['approved', 'rejected'] })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403, 'a previously-approved umpire whose standing was later rejected must lose access immediately')
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 6b — multiple requests: an old REJECTED request followed by a newer APPROVED one grants access (latest wins)', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'rejected-then-approved', playerType: 'umpire', requestStatuses: ['rejected', 'approved'] })
  try {
    const { status, data } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 200, JSON.stringify(data))
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('Case 6c — multiple requests: old APPROVED followed by a newer still-PENDING re-request denies access', async () => {
  const server = await startTestApp()
  const user = await makeUser({ label: 'approved-then-pending', playerType: 'umpire', requestStatuses: ['approved', 'pending'] })
  try {
    const { status } = await json(`${server.baseUrl}/scorer-only`, { token: user.token })
    assert.equal(status, 403, 'a pending re-request must not inherit authorization from an earlier, now-superseded approval')
  } finally {
    await user.cleanup()
    await server.close()
  }
})
