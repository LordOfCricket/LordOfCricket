// Phase 6 — step-up re-authentication for the evidence-based list of
// high-leverage mutations (STAFF_CREATE, GROUND_OWNER_REQUEST_APPROVE,
// PERMISSION_GRANT, STAFF_DISABLE), plus the negative-space guard (routine
// mutations that must NEVER require step-up) and single-use/concurrency
// enforcement. Real HTTP + real Postgres, same pattern as
// mfa.integration.test.js. Fixtures are created once per role via
// test.before to amortize the ~30s TOTP time-step wait each fresh
// verification needs (see helpers/mfaFixtures.js#nextTotpCode) — this file
// is expected to take a few minutes of real wall-clock time, not because
// anything is slow, but because it is genuinely waiting on real 30-second
// TOTP windows rather than mocking them away.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import { pool } from '../../config/db.js'
import app from '../../app.js'
import { generatePublicId } from '../../utils/publicId.js'
import { createRequest as createGroundOwnerRequest } from '../../models/groundOwnerRequest.model.js'
import { createMfaVerifiedSuperAdmin, createMfaVerifiedGroundOwner, nextTotpCode, stepUpVerifyTotp } from './helpers/mfaFixtures.js'

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
const testEmail = (label) => `stepup-integration-${label}-${uniqueTag()}@example.test`

async function cleanupUser(userId) {
  if (!userId) return
  await pool.query('DELETE FROM step_up_grants WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM totp_credentials WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM account_audit_log WHERE actor_user_id = $1 OR target_user_id = $1', [userId])
  await pool.query('DELETE FROM ground_users WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM otp_codes WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM users WHERE id = $1', [userId])
}

async function createGroundFixture(label) {
  const { rows } = await pool.query(
    `INSERT INTO grounds (public_ground_id, slug, name, status) VALUES ($1,$2,$3,'ACTIVE') RETURNING *`,
    [generatePublicId('GRD', 8), `stepup-integration-ground-${label}-${uniqueTag()}`, `Step-Up Integration Ground ${label}`],
  )
  return rows[0]
}

// --- SUPER_ADMIN-scoped gated actions --------------------------------------

test('SUPER_ADMIN step-up scopes: STAFF_CREATE and GROUND_OWNER_REQUEST_APPROVE', async (t) => {
  const app_ = await startTestApp()
  let superAdmin
  const createdUserIds = []
  let pendingRequestId
  t.after(async () => {
    for (const id of createdUserIds) await cleanupUser(id)
    if (superAdmin) await cleanupUser(superAdmin.userId)
    if (pendingRequestId) await pool.query('DELETE FROM ground_owner_requests WHERE id = $1', [pendingRequestId])
    await app_.close()
  })

  superAdmin = await createMfaVerifiedSuperAdmin(app_.baseUrl, testEmail('super-admin'))
  let lastStep = superAdmin.lastStep

  await t.test('POST /staff without a fresh step-up grant is rejected', async () => {
    const res = await fetch(`${app_.baseUrl}/staff`, {
      method: 'POST',
      headers: { Cookie: superAdmin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Admin', email: testEmail('target-1'), password: 'password123', role: 'admin' }),
    })
    assert.equal(res.status, 403)
    const body = await res.json()
    assert.equal(body.code, 'STEP_UP_REQUIRED')
  })

  await t.test('after a fresh step-up verify, POST /staff succeeds — and the grant is single-use', async () => {
    const stepUp = await stepUpVerifyTotp(app_.baseUrl, superAdmin.cookie, superAdmin.secret, lastStep, 'STAFF_CREATE')
    assert.equal(stepUp.res.status, 200)
    lastStep = stepUp.step

    const targetEmail = testEmail('target-2')
    const createRes = await fetch(`${app_.baseUrl}/staff`, {
      method: 'POST',
      headers: { Cookie: superAdmin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Admin', email: targetEmail, password: 'password123', role: 'admin' }),
    })
    assert.equal(createRes.status, 201)
    const created = await createRes.json()
    createdUserIds.push(created.user.id)

    // Single-use: the exact same grant must not authorize a SECOND creation.
    const secondRes = await fetch(`${app_.baseUrl}/staff`, {
      method: 'POST',
      headers: { Cookie: superAdmin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Another Admin', email: testEmail('target-3'), password: 'password123', role: 'admin' }),
    })
    assert.equal(secondRes.status, 403)
    assert.equal((await secondRes.json()).code, 'STEP_UP_REQUIRED')
  })

  await t.test('ground-owner-request approve: gated by GROUND_OWNER_REQUEST_APPROVE, independent of STAFF_CREATE', async () => {
    const publicRequestId = generatePublicId('GOR', 8)
    const request = await createGroundOwnerRequest({
      publicRequestId,
      applicantName: 'Step-Up Applicant',
      applicantEmail: testEmail('applicant'),
      applicantPhone: null,
      groundName: 'Step-Up Test Ground',
      groundDescription: 'desc',
      addressLine: '1 Test Rd',
      city: 'Testville',
      state: 'TS',
      postalCode: '000000',
      latitude: 0,
      longitude: 0,
      groundPhone: '+911234567890',
      groundEmail: null,
      groundWebsite: null,
    })
    pendingRequestId = request.id

    const deniedRes = await fetch(`${app_.baseUrl}/ground-owner-requests/${publicRequestId}/approve`, {
      method: 'POST',
      headers: { Cookie: superAdmin.cookie },
    })
    assert.equal(deniedRes.status, 403, 'STAFF_CREATE grant scope must not authorize an approve action')
    assert.equal((await deniedRes.json()).code, 'STEP_UP_REQUIRED')

    const stepUp = await stepUpVerifyTotp(app_.baseUrl, superAdmin.cookie, superAdmin.secret, lastStep, 'GROUND_OWNER_REQUEST_APPROVE')
    assert.equal(stepUp.res.status, 200)
    lastStep = stepUp.step

    const approveRes = await fetch(`${app_.baseUrl}/ground-owner-requests/${publicRequestId}/approve`, {
      method: 'POST',
      headers: { Cookie: superAdmin.cookie },
    })
    assert.equal(approveRes.status, 200)
    const approved = await approveRes.json()
    assert.equal(approved.request.status, 'APPROVED')
    assert.equal(approved.ground.status, 'ACTIVE')
    await pool.query('DELETE FROM grounds WHERE public_ground_id = $1', [approved.ground.publicGroundId])
  })

  await t.test('concurrent double-consumption of one step-up grant: exactly one HTTP call succeeds', async () => {
    const stepUp = await stepUpVerifyTotp(app_.baseUrl, superAdmin.cookie, superAdmin.secret, lastStep, 'STAFF_CREATE')
    assert.equal(stepUp.res.status, 200)
    lastStep = stepUp.step

    const emailA = testEmail('race-a')
    const emailB = testEmail('race-b')
    const [resA, resB] = await Promise.all([
      fetch(`${app_.baseUrl}/staff`, {
        method: 'POST',
        headers: { Cookie: superAdmin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Race A', email: emailA, password: 'password123', role: 'admin' }),
      }),
      fetch(`${app_.baseUrl}/staff`, {
        method: 'POST',
        headers: { Cookie: superAdmin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Race B', email: emailB, password: 'password123', role: 'admin' }),
      }),
    ])
    const statuses = [resA.status, resB.status].sort()
    assert.deepEqual(statuses, [201, 403], 'exactly one concurrent request must succeed, the other must be denied')

    const succeeded = resA.status === 201 ? await resA.json() : await resB.json()
    createdUserIds.push(succeeded.user.id)
  })
})

// --- GROUND_OWNER-scoped gated actions + negative space --------------------

test('GROUND_OWNER step-up scope: PERMISSION_GRANT is gated, revoke and staff creation are NOT (negative space)', async (t) => {
  const app_ = await startTestApp()
  let owner
  let ground
  let staffMembershipId
  let staffUserId
  t.after(async () => {
    if (owner) await cleanupUser(owner.userId)
    if (staffUserId) await cleanupUser(staffUserId)
    if (ground) await pool.query('DELETE FROM grounds WHERE id = $1', [ground.id])
    await app_.close()
  })

  ground = await createGroundFixture('permission-grant')
  owner = await createMfaVerifiedGroundOwner(app_.baseUrl, testEmail('ground-owner'), ground)
  let lastStep = owner.lastStep

  await t.test('createGroundStaff (staff creation) succeeds with NO step-up — negative space', async () => {
    const res = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff`, {
      method: 'POST',
      headers: { Cookie: owner.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ground Admin', identifier: testEmail('ground-admin'), role: 'GROUND_ADMIN' }),
    })
    assert.equal(res.status, 201, 'creating a brand-new, zero-permission staff member must never require step-up')
    const body = await res.json()
    staffMembershipId = body.membership.id
    staffUserId = body.user.id
  })

  let permissionKey
  await t.test('granting a permission without step-up is rejected', async () => {
    const catalogRes = await fetch(`${app_.baseUrl}/ground-owner/permissions/catalog`, { headers: { Cookie: owner.cookie } })
    const { permissions } = await catalogRes.json()
    permissionKey = permissions[0].key

    const res = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff/${staffMembershipId}/permissions`, {
      method: 'POST',
      headers: { Cookie: owner.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionKey }),
    })
    assert.equal(res.status, 403)
    assert.equal((await res.json()).code, 'STEP_UP_REQUIRED')
  })

  await t.test('after step-up verify (PERMISSION_GRANT), the grant succeeds', async () => {
    const stepUp = await stepUpVerifyTotp(app_.baseUrl, owner.cookie, owner.secret, lastStep, 'PERMISSION_GRANT')
    assert.equal(stepUp.res.status, 200)
    lastStep = stepUp.step

    const res = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff/${staffMembershipId}/permissions`, {
      method: 'POST',
      headers: { Cookie: owner.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionKey }),
    })
    assert.equal(res.status, 201)
  })

  await t.test('revoking that SAME permission requires NO step-up — negative space (revoke only ever reduces privilege)', async () => {
    const res = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff/${staffMembershipId}/permissions/${permissionKey}`, {
      method: 'DELETE',
      headers: { Cookie: owner.cookie },
    })
    assert.equal(res.status, 200)
    assert.equal((await res.json()).revoked, true)
  })

  await t.test('disabling the staff membership without step-up is rejected, then succeeds after STAFF_DISABLE step-up', async () => {
    const deniedRes = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff/${staffMembershipId}/disable`, {
      method: 'PATCH',
      headers: { Cookie: owner.cookie },
    })
    assert.equal(deniedRes.status, 403)
    assert.equal((await deniedRes.json()).code, 'STEP_UP_REQUIRED')

    const stepUp = await stepUpVerifyTotp(app_.baseUrl, owner.cookie, owner.secret, lastStep, 'STAFF_DISABLE')
    assert.equal(stepUp.res.status, 200)

    const disableRes = await fetch(`${app_.baseUrl}/ground-owner/grounds/${ground.public_ground_id}/staff/${staffMembershipId}/disable`, {
      method: 'PATCH',
      headers: { Cookie: owner.cookie },
    })
    assert.equal(disableRes.status, 200)

    const row = await pool.query('SELECT is_active FROM ground_users WHERE id = $1', [staffMembershipId])
    assert.equal(row.rows[0].is_active, false)
  })
})
