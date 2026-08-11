// Self-serve ground registration (POST /grounds) + the admin review queue
// that activates/rejects it (GET/PATCH /ground-review). Real HTTP against
// this app's own server, real Postgres — same pattern as every other
// integration test in this codebase (http.createServer(app), plain fetch(),
// no mocking).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import app from '../../app.js'
import { pool } from '../../config/db.js'
import { signToken } from '../../utils/jwt.js'

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

async function cleanupGroundByPublicId(publicGroundId) {
  const { rows } = await pool.query('SELECT id FROM grounds WHERE public_ground_id = $1', [publicGroundId])
  if (!rows[0]) return
  await pool.query('DELETE FROM ground_users WHERE ground_id = $1', [rows[0].id])
  await pool.query('DELETE FROM grounds WHERE id = $1', [rows[0].id])
}

// --- POST /grounds (registration) ------------------------------------------

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

test('POST /grounds: rejects an invalid email', async () => {
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

test('POST /grounds: a valid submission creates a DRAFT ground + a GROUND_OWNER membership for the submitter, invisible on public endpoints until reviewed', async () => {
  const server = await startTestApp()
  const user = await createUser('valid')
  let publicGroundId
  try {
    const res = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(user.token), body: JSON.stringify(validRegistrationBody('valid')) })
    assert.equal(res.status, 201)
    const body = await res.json()
    publicGroundId = body.ground.publicGroundId
    assert.equal(body.ground.status, 'DRAFT')
    assert.ok(body.ground.slug)

    const dbRow = (await pool.query('SELECT * FROM grounds WHERE public_ground_id = $1', [publicGroundId])).rows[0]
    assert.equal(dbRow.status, 'DRAFT')

    const membership = (await pool.query('SELECT * FROM ground_users WHERE ground_id = $1 AND user_id = $2', [dbRow.id, user.id])).rows[0]
    assert.ok(membership, 'a GROUND_OWNER membership row must exist for the submitting user')
    assert.equal(membership.role, 'GROUND_OWNER')
    assert.equal(membership.is_active, true)

    // Not publicly visible yet — every public discovery endpoint filters status = 'ACTIVE'.
    const profileRes = await fetch(`${server.baseUrl}/grounds/${publicGroundId}`)
    assert.equal(profileRes.status, 404)
    const listRes = await fetch(`${server.baseUrl}/grounds?limit=200`)
    const listBody = await listRes.json()
    assert.ok(!listBody.grounds.some((g) => g.publicGroundId === publicGroundId), 'a DRAFT ground must not appear in the public browse list')
  } finally {
    if (publicGroundId) await cleanupGroundByPublicId(publicGroundId)
    await user.cleanup()
    await server.close()
  }
})

// --- GET/PATCH /ground-review (admin queue) ---------------------------------

test('GET /ground-review: rejects an unauthenticated request', async () => {
  const server = await startTestApp()
  try {
    const res = await fetch(`${server.baseUrl}/ground-review`)
    assert.equal(res.status, 401)
  } finally {
    await server.close()
  }
})

test('GET /ground-review: rejects a non-super_admin staff member', async () => {
  const server = await startTestApp()
  const admin = await createUser('non-super', { role: 'staff', staffRoleId: 2 }) // 2 = 'admin', not 'super_admin'
  try {
    const res = await fetch(`${server.baseUrl}/ground-review`, { headers: authHeader(admin.token) })
    assert.equal(res.status, 403)
  } finally {
    await admin.cleanup()
    await server.close()
  }
})

test('GET /ground-review + PATCH: super_admin can list a pending submission and approve it, making it publicly visible', async () => {
  const server = await startTestApp()
  const owner = await createUser('flow-owner')
  const superAdmin = await createUser('flow-admin', { role: 'staff', staffRoleId: 1 }) // 1 = 'super_admin'
  let publicGroundId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('flow')) })
    publicGroundId = (await createRes.json()).ground.publicGroundId

    const pendingRes = await fetch(`${server.baseUrl}/ground-review`, { headers: authHeader(superAdmin.token) })
    assert.equal(pendingRes.status, 200)
    const pendingBody = await pendingRes.json()
    assert.ok(pendingBody.grounds.some((g) => g.publicGroundId === publicGroundId), 'the pending queue must include the freshly submitted ground')

    const approveRes = await fetch(`${server.baseUrl}/ground-review/${publicGroundId}`, {
      method: 'PATCH',
      headers: authHeader(superAdmin.token),
      body: JSON.stringify({ status: 'approved' }),
    })
    assert.equal(approveRes.status, 200)
    const approveBody = await approveRes.json()
    assert.equal(approveBody.ground.status, 'ACTIVE')

    const profileRes = await fetch(`${server.baseUrl}/grounds/${publicGroundId}`)
    assert.equal(profileRes.status, 200, 'an ACTIVE ground must now be publicly visible')
  } finally {
    if (publicGroundId) await cleanupGroundByPublicId(publicGroundId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})

test('PATCH /ground-review: rejecting a pending ground sets it to SUSPENDED', async () => {
  const server = await startTestApp()
  const owner = await createUser('reject-owner')
  const superAdmin = await createUser('reject-admin', { role: 'staff', staffRoleId: 1 })
  let publicGroundId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('reject')) })
    publicGroundId = (await createRes.json()).ground.publicGroundId

    const rejectRes = await fetch(`${server.baseUrl}/ground-review/${publicGroundId}`, {
      method: 'PATCH',
      headers: authHeader(superAdmin.token),
      body: JSON.stringify({ status: 'rejected' }),
    })
    assert.equal(rejectRes.status, 200)
    assert.equal((await rejectRes.json()).ground.status, 'SUSPENDED')
  } finally {
    if (publicGroundId) await cleanupGroundByPublicId(publicGroundId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})

test('PATCH /ground-review: an invalid status value is rejected, and deciding an already-decided ground 404s', async () => {
  const server = await startTestApp()
  const owner = await createUser('twice-owner')
  const superAdmin = await createUser('twice-admin', { role: 'staff', staffRoleId: 1 })
  let publicGroundId
  try {
    const createRes = await fetch(`${server.baseUrl}/grounds`, { method: 'POST', headers: authHeader(owner.token), body: JSON.stringify(validRegistrationBody('twice')) })
    publicGroundId = (await createRes.json()).ground.publicGroundId

    const badStatusRes = await fetch(`${server.baseUrl}/ground-review/${publicGroundId}`, {
      method: 'PATCH',
      headers: authHeader(superAdmin.token),
      body: JSON.stringify({ status: 'maybe' }),
    })
    assert.equal(badStatusRes.status, 400)

    const firstDecision = await fetch(`${server.baseUrl}/ground-review/${publicGroundId}`, {
      method: 'PATCH',
      headers: authHeader(superAdmin.token),
      body: JSON.stringify({ status: 'approved' }),
    })
    assert.equal(firstDecision.status, 200)

    const secondDecision = await fetch(`${server.baseUrl}/ground-review/${publicGroundId}`, {
      method: 'PATCH',
      headers: authHeader(superAdmin.token),
      body: JSON.stringify({ status: 'rejected' }),
    })
    assert.equal(secondDecision.status, 404, 'a ground that is no longer DRAFT cannot be decided again')
  } finally {
    if (publicGroundId) await cleanupGroundByPublicId(publicGroundId)
    await owner.cleanup()
    await superAdmin.cleanup()
    await server.close()
  }
})
