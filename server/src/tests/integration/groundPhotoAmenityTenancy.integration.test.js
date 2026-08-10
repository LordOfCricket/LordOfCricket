// Phase 12 — ground_photos/amenities gained a NOT NULL ground_id (Step 1's
// discovery that neither table had any ground relationship at all). The
// admin upload routes (POST /api/ground-photos, POST /api/amenities) now
// resolve it server-side via attachSingleGroundContext, mirroring
// attachCurrentCanteen's Phase 10 fail-safe shape exactly: works unchanged
// while exactly one ground exists, 409s rather than guessing once a second
// one does. This file proves both halves over real HTTP.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import app from '../../app.js'
import { pool } from '../../config/db.js'
import { signToken } from '../../utils/jwt.js'
import { generatePublicId } from '../../utils/publicId.js'

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

async function createSuperAdmin(label) {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const user = (
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, staff_role_id) VALUES ($1,$2,'not-a-real-hash','staff',1) RETURNING *`,
      [`Integration Test ${label}`, `integration-test-gpa-${label}-${tag}@example.test`],
    )
  ).rows[0]
  return {
    id: user.id,
    token: signToken({ id: user.id }),
    async cleanup() {
      await pool.query('DELETE FROM users WHERE id = $1', [user.id])
    },
  }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

test('WRITE PATH: uploading a ground photo / amenity still works unchanged while exactly one ground exists', async () => {
  const server = await startTestApp()
  const admin = await createSuperAdmin('write-single')
  let createdPhotoId, createdAmenityId
  try {
    const photoRes = await fetch(`${server.baseUrl}/ground-photos`, {
      method: 'POST',
      headers: authHeader(admin.token),
      body: JSON.stringify({ title: 'phase12-write-test-photo', imageUrl: 'https://example.test/p.jpg' }),
    })
    assert.equal(photoRes.status, 201)
    const photoBody = await photoRes.json()
    createdPhotoId = photoBody.id
    assert.ok(photoBody.ground_id, 'the created row must have a ground_id assigned')

    const amenityRes = await fetch(`${server.baseUrl}/amenities`, {
      method: 'POST',
      headers: authHeader(admin.token),
      body: JSON.stringify({ name: 'phase12-write-test-amenity', imageUrl: 'https://example.test/a.jpg' }),
    })
    assert.equal(amenityRes.status, 201)
    const amenityBody = await amenityRes.json()
    createdAmenityId = amenityBody.id
    assert.ok(amenityBody.ground_id, 'the created row must have a ground_id assigned')
  } finally {
    if (createdPhotoId) await pool.query('DELETE FROM ground_photos WHERE id = $1', [createdPhotoId])
    if (createdAmenityId) await pool.query('DELETE FROM amenities WHERE id = $1', [createdAmenityId])
    await admin.cleanup()
    await server.close()
  }
})

test('WRITE PATH FAIL-SAFE: once a second ground exists, uploads 409 instead of guessing which ground owns them', async () => {
  const server = await startTestApp()
  const admin = await createSuperAdmin('write-ambiguous')
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const secondGround = (
    await pool.query(
      `INSERT INTO grounds (public_ground_id, slug, name, status) VALUES ($1,$2,$3,'ACTIVE') RETURNING *`,
      [generatePublicId('GRD', 8), `integration-test-gpa-second-${tag}`, `Integration Test Second Ground ${tag}`],
    )
  ).rows[0]
  try {
    const photoRes = await fetch(`${server.baseUrl}/ground-photos`, {
      method: 'POST',
      headers: authHeader(admin.token),
      body: JSON.stringify({ title: 'should-not-be-created', imageUrl: 'https://example.test/x.jpg' }),
    })
    assert.equal(photoRes.status, 409, 'ground_photos upload must fail safely, never silently pick a ground')

    const amenityRes = await fetch(`${server.baseUrl}/amenities`, {
      method: 'POST',
      headers: authHeader(admin.token),
      body: JSON.stringify({ name: 'should-not-be-created', imageUrl: 'https://example.test/y.jpg' }),
    })
    assert.equal(amenityRes.status, 409, 'amenities upload must fail safely, never silently pick a ground')

    const orphanPhotos = (await pool.query(`SELECT id FROM ground_photos WHERE title = 'should-not-be-created'`)).rows
    const orphanAmenities = (await pool.query(`SELECT id FROM amenities WHERE name = 'should-not-be-created'`)).rows
    assert.equal(orphanPhotos.length, 0, 'no orphaned photo row must have been created')
    assert.equal(orphanAmenities.length, 0, 'no orphaned amenity row must have been created')
  } finally {
    await pool.query('DELETE FROM grounds WHERE id = $1', [secondGround.id])
    await admin.cleanup()
    await server.close()
  }
})
