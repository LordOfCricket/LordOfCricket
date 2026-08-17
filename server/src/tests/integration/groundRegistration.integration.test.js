// Phase 4 — Ground Owner registration is now request/approval, not
// immediate self-serve. POST /grounds (still requireAuth, unchanged route)
// creates a PENDING ground_owner_requests row instead of an ACTIVE-bound
// DRAFT ground + immediate GROUND_OWNER membership (the bug this phase
// fixes — see ground.controller.js#registerGround and
// groundOwnerRequest.service.js). The old GET/PATCH /ground-review admin
// queue is retired; /ground-owner-requests replaces it. Real HTTP against
// this app's own server, real Postgres — same pattern as every other
// integration test in this codebase (http.createServer(app), plain fetch(),
// no mocking).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import app from '../../app.js'
import { pool } from '../../config/db.js'
import { signToken } from '../../utils/jwt.js'
import { mintMfaVerifiedSessionCookie, mintStepUpGrant } from './helpers/mfaFixtures.js'

async function startTestApp() {
  const httpServer = http.createServer(app)
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  return {
    baseUrl: `http://localhost:${port}/api`,
    async close() {
      await new Promise((resolve) => httpServer.close(resolve))
    },
  }
}

const uniqueTag = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

async function createUser(label, { role = 'player', staffRoleId = null } = {}) {
  const tag = uniqueTag()
  const user = (
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, staff_role_id) VALUES ($1,$2,'not-a-real-hash',$3,$4) RETURNING *`,
      [`Integration Test ${label}`, `integration-test-greg-${label}-${tag}@example.test`, role, staffRoleId],
    )
  ).rows[0]
  return {
    id: user.id,
    email: user.email,
    token: signToken({ id: user.id }),
    async cleanup() {
      await pool.query('DELETE FROM ground_users WHERE user_id = $1', [user.id])
      await pool.query('DELETE FROM users WHERE id = $1', [user.id])
    },
  }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// Phase 6 — super_admin's own MFA mandate now applies to every
// requireStaffRole('super_admin') route (list/getDetail/approve/reject/
// requestInformation all share the same gate). A bare JWT can never satisfy
// it (no backing `sessions` row — see docs/MFA.md), so this admin queue's
// tests need a REAL, already-MFA-verified session cookie. See
// helpers/mfaFixtures.js#mintMfaVerifiedSessionCookie for why this skips
// the real TOTP ceremony (this file isn't testing MFA, only the approve/
// reject queue) while still going through the real session-cookie path.
function cookieHeader(cookie) {
  return { Cookie: cookie, 'Content-Type': 'application/json' }
}

function validRegistrationBody(label) {
  const tag = uniqueTag()
  return {
    name: `Integration Test Ground ${label} ${tag}`,
    description: 'A real cricket ground submitted for review.',
    addressLine: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    postalCode: '110001',
    phone: '9999999999',
    email: 'owner@example.test',
    website: 'https://example.test',
  }
}

async function cleanupRequestByPublicId(publicRequestId) {
  if (!publicRequestId) return
  const { rows } = await pool.query('SELECT * FROM ground_owner_requests WHERE public_request_id = $1', [publicRequestId])
  const request = rows[0]
  if (!request) return
  if (request.created_ground_id) {
    await pool.query('DELETE FROM ground_users WHERE ground_id = $1', [request.created_ground_id])
    await pool.query('DELETE FROM grounds WHERE id = $1', [request.created_ground_id])
  }
  await pool.query('DELETE FROM account_audit_log WHERE target_request_id = $1', [request.id])
  await pool.query('DELETE FROM ground_owner_requests WHERE id = $1', [request.id])
}

// --- POST /grounds (submits a ground_owner_requests row) -------------------

test('POST /grounds: rejects an unauthenticated request', async () => {
  const server = await startTestApp()
  try {
    const res = await fetch(`${server.baseUrl}/grounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationBody('noauth')),
    })
    assert.equal(res.status, 401)
  } finally {
    await server.close()
  }
})

test('POST /grounds: rejects a missing required field (name)', async () => {
  const server = await startTestApp()
  const user = await createUser('missing-name')
  try {
    const body = validRegistrationBody('missing-name')
    delete body.name
    const res = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(user.token), body: JSON.stringify(body) })
    assert.equal(res.status, 400)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('POST /grounds: rejects a missing required field (phone)', async () => {
  const server = await startTestApp()
  const user = await createUser('missing-phone')
  try {
    const body = validRegistrationBody('missing-phone')
    delete body.phone
    const res = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(user.token), body: JSON.stringify(body) })
    assert.equal(res.status, 400)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('POST /grounds: rejects an invalid ground email', async () => {
  const server = await startTestApp()
  const user = await createUser('bad-email')
  try {
    const body = validRegistrationBody('bad-email')
    body.email = 'not-an-email'
    const res = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(user.token), body: JSON.stringify(body) })
    assert.equal(res.status, 400)
  } finally {
    await user.cleanup()
    await server.close()
  }
})

test('POST /grounds: a valid submission creates a PENDING request identified by the submitter, WITHOUT creating a ground or granting any membership', async () => {
  const server = await startTestApp()
  const user = await createUser('valid')
  let publicRequestId
  try {
    const res = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(user.token), body: JSON.stringify(validRegistrationBody('valid')) })
    assert.equal(res.status, 201)
    const body = await res.json()
    publicRequestId = body.request.publicRequestId
    assert.equal(body.request.status, 'PENDING')
    assert.ok(publicRequestId)

    const dbRow = (await pool.query('SELECT * FROM ground_owner_requests WHERE public_request_id = $1', [publicRequestId])).rows[0]
    assert.equal(dbRow.status, 'PENDING')
    assert.equal(dbRow.applicant_email, user.email, 'the applicant identity must come from the authenticated session, not the request body')
    assert.equal(dbRow.created_ground_id, null)

    // This is the exact bug Phase 4 fixes: submitting a request must NOT
    // grant GROUND_OWNER membership or create a ground before any review.
    const membership = (await pool.query('SELECT * FROM ground_users WHERE user_id = $1', [user.id])).rows[0]
    assert.equal(membership, undefined, 'no ground_users membership should exist before a super_admin approves the request')
    assert.equal((await pool.query('SELECT * FROM grounds WHERE name = $1', [dbRow.ground_name])).rows[0], undefined)
  } finally {
    await cleanupRequestByPublicId(publicRequestId)
    await user.cleanup()
    await server.close()
  }
})

// --- GET/POST /ground-owner-requests (admin queue) --------------------------

test('GET /ground-owner-requests: rejects an unauthenticated request', async () => {
  const server = await startTestApp()
  try {
    const res = await fetch(`${server.baseUrl}/ground-owner-requests`)
    assert.equal(res.status, 401)
  } finally {
    await server.close()
  }
})

test('GET /ground-owner-requests: rejects a non-super_admin staff member', async () => {
  const server = await startTestApp()
  const admin = await createUser('non-super', { role: 'staff', staffRoleId: 2 }) // 2 = 'admin', not 'super_admin'
  try {
    const res = await fetch(`${server.baseUrl}/ground-owner-requests`, { headers: authHeader(admin.token) })
    assert.equal(res.status, 403)
  } finally {
    await admin.cleanup()
    await server.close()
  }
})

test('ground-owner-requests: super_admin can list a pending submission, approve it, and it becomes publicly visible with a real GROUND_OWNER membership', async () => {
  const server = await startTestApp()
  const owner = await createUser('flow-owner')
  const superAdmin = await createUser('flow-admin', { role: 'staff', staffRoleId: 1 }) // 1 = 'super_admin'
  const { cookie: superAdminCookie, sessionId: superAdminSessionId } = await mintMfaVerifiedSessionCookie(superAdmin.id)
  let publicRequestId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('flow')) })
    publicRequestId = (await createRes.json()).request.publicRequestId

    const pendingRes = await fetch(`${server.baseUrl}/ground-owner-requests`, { headers: cookieHeader(superAdminCookie) })
    assert.equal(pendingRes.status, 200)
    const pendingBody = await pendingRes.json()
    assert.ok(pendingBody.requests.some((r) => r.publicRequestId === publicRequestId), 'the pending queue must include the freshly submitted request')

    await mintStepUpGrant(superAdminSessionId, superAdmin.id, 'GROUND_OWNER_REQUEST_APPROVE')
    const approveRes = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/approve`, {
      method: 'POST',
      headers: cookieHeader(superAdminCookie),
    })
    assert.equal(approveRes.status, 200)
    const approveBody = await approveRes.json()
    assert.equal(approveBody.request.status, 'APPROVED')
    assert.equal(approveBody.ground.status, 'ACTIVE')
    const publicGroundId = approveBody.ground.publicGroundId

    const profileRes = await fetch(`${server.baseUrl}/grounds/${publicGroundId}`)
    assert.equal(profileRes.status, 200, 'an ACTIVE ground must now be publicly visible')

    const dbGround = (await pool.query('SELECT * FROM grounds WHERE public_ground_id = $1', [publicGroundId])).rows[0]
    const membership = (await pool.query('SELECT * FROM ground_users WHERE ground_id = $1 AND user_id = $2', [dbGround.id, owner.id])).rows[0]
    assert.ok(membership, 'approval must grant a real GROUND_OWNER membership for the applicant')
    assert.equal(membership.role, 'GROUND_OWNER')
    assert.equal(membership.is_active, true)

    const auditRow = (await pool.query(`SELECT * FROM account_audit_log WHERE event_type = 'GROUND_OWNER_APPROVED' AND target_request_id = (SELECT id FROM ground_owner_requests WHERE public_request_id = $1)`, [publicRequestId])).rows[0]
    assert.ok(auditRow, 'approval must write a GROUND_OWNER_APPROVED audit event')
  } finally {
    await cleanupRequestByPublicId(publicRequestId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})

test('ground-owner-requests: rejecting a pending request requires a reason and sets it to REJECTED, visible via the public status check', async () => {
  const server = await startTestApp()
  const owner = await createUser('reject-owner')
  const superAdmin = await createUser('reject-admin', { role: 'staff', staffRoleId: 1 })
  const { cookie: superAdminCookie } = await mintMfaVerifiedSessionCookie(superAdmin.id)
  let publicRequestId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('reject')) })
    publicRequestId = (await createRes.json()).request.publicRequestId

    const noReasonRes = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/reject`, {
      method: 'POST',
      headers: cookieHeader(superAdminCookie),
      body: JSON.stringify({}),
    })
    assert.equal(noReasonRes.status, 400)

    const rejectRes = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/reject`, {
      method: 'POST',
      headers: cookieHeader(superAdminCookie),
      body: JSON.stringify({ reason: 'Address could not be verified.' }),
    })
    assert.equal(rejectRes.status, 200)
    assert.equal((await rejectRes.json()).request.status, 'REJECTED')

    const statusRes = await fetch(`${server.baseUrl}/ground-owner-requests/status/${publicRequestId}`)
    assert.equal(statusRes.status, 200)
    const statusBody = await statusRes.json()
    assert.equal(statusBody.request.status, 'REJECTED')
    assert.equal(statusBody.request.rejectionReason, 'Address could not be verified.')
    assert.equal(statusBody.request.reviewedBy, undefined, 'the public status check must never expose reviewed_by')
  } finally {
    await cleanupRequestByPublicId(publicRequestId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})

test('ground-owner-requests: deciding an already-decided request is rejected (no double-approval)', async () => {
  const server = await startTestApp()
  const owner = await createUser('twice-owner')
  const superAdmin = await createUser('twice-admin', { role: 'staff', staffRoleId: 1 })
  const { cookie: superAdminCookie, sessionId: superAdminSessionId } = await mintMfaVerifiedSessionCookie(superAdmin.id)
  let publicRequestId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('twice')) })
    publicRequestId = (await createRes.json()).request.publicRequestId

    await mintStepUpGrant(superAdminSessionId, superAdmin.id, 'GROUND_OWNER_REQUEST_APPROVE')
    const firstDecision = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/approve`, { method: 'POST', headers: cookieHeader(superAdminCookie) })
    assert.equal(firstDecision.status, 200)

    // A fresh grant is minted again so the second decision fails on
    // "already decided" (409 REQUEST_NOT_ELIGIBLE) specifically, not on a
    // missing step-up grant (403) — step-up single-use enforcement itself
    // is covered separately in stepUp.integration.test.js.
    await mintStepUpGrant(superAdminSessionId, superAdmin.id, 'GROUND_OWNER_REQUEST_APPROVE')
    const secondDecision = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/approve`, { method: 'POST', headers: cookieHeader(superAdminCookie) })
    assert.equal(secondDecision.status, 409, 'a request that is no longer PENDING/UNDER_REVIEW cannot be approved again')

    const rejectAfterApprove = await fetch(`${server.baseUrl}/ground-owner-requests/${publicRequestId}/reject`, {
      method: 'POST',
      headers: cookieHeader(superAdminCookie),
      body: JSON.stringify({ reason: 'too late' }),
    })
    assert.equal(rejectAfterApprove.status, 409)
  } finally {
    await cleanupRequestByPublicId(publicRequestId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})

test('GET /ground-owner-requests/status/:publicRequestId: unknown reference id 404s, never enumerable', async () => {
  const server = await startTestApp()
  try {
    const res = await fetch(`${server.baseUrl}/ground-owner-requests/status/GOR-DOESNOTEXIST`)
    assert.equal(res.status, 404)
  } finally {
    await server.close()
  }
})
