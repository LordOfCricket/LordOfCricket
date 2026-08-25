// Ground Time-Slot Pricing — server-side price calculation + the price
// snapshot rule, exercised through the real booking-creation service
// (the same function the public/customer walk-in booking route calls).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'http'
import app from '../../app.js'
import { pool } from '../../config/db.js'
import { generatePublicId } from '../../utils/publicId.js'
import { signToken } from '../../utils/jwt.js'
import * as bookingService from '../../services/groundBooking.service.js'
import * as pricingService from '../../services/groundPricing.service.js'

async function startTestApp() {
  const httpServer = http.createServer(app)
  app.locals.io = { emit: () => {}, to: () => ({ emit: () => {} }) }
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  return { baseUrl: `http://localhost:${port}/api`, async close() { await new Promise((r) => httpServer.close(r)) } }
}

const uniqueTag = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

function tomorrowDateStr(daysAhead = 1) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

async function createGround(label) {
  const { rows } = await pool.query(`INSERT INTO grounds (public_ground_id, slug, name, status) VALUES ($1,$2,$3,'ACTIVE') RETURNING *`, [
    generatePublicId('GRD', 8),
    `integration-test-pricing-booking-${label}-${uniqueTag()}`,
    `Integration Test Pricing Booking Ground ${label}`,
  ])
  return rows[0]
}

async function cleanupGround(ground) {
  await pool.query('DELETE FROM ground_bookings WHERE ground_id = $1', [ground.id])
  await pool.query('DELETE FROM ground_audit_log WHERE entity_type = $1 AND entity_id IN (SELECT id FROM ground_pricing_slots WHERE ground_id = $2)', [
    'PRICING_SLOT',
    ground.id,
  ])
  await pool.query('DELETE FROM ground_pricing_slots WHERE ground_id = $1', [ground.id])
  await pool.query('DELETE FROM grounds WHERE id = $1', [ground.id])
}

test('booking price calculation: server computes and snapshots the price at creation time, independent of any client input', async () => {
  const ground = await createGround('calc')
  try {
    const slot = await pricingService.createPricingSlot(ground, { startTime: '06:00', endTime: '09:00', price: 2000 }, null)

    const dateStr = tomorrowDateStr(3)
    const { booking } = await bookingService.createBooking({
      dateStr,
      hour: 6,
      minute: 0,
      customerName: 'Pricing Test Customer',
      groundId: ground.id,
    })

    assert.equal(Number(booking.amount), 2000)
    assert.equal(booking.pricing_slot_id, slot.id)
  } finally {
    await cleanupGround(ground)
  }
})

test('booking price calculation: no active pricing slot covers the requested time — booking still succeeds with amount=null ("price on request")', async () => {
  const ground = await createGround('none')
  try {
    // A slot exists, but nowhere near the requested 14:00 start.
    await pricingService.createPricingSlot(ground, { startTime: '06:00', endTime: '09:00', price: 2000 }, null)

    const dateStr = tomorrowDateStr(3)
    const { booking } = await bookingService.createBooking({
      dateStr,
      hour: 14,
      minute: 0,
      customerName: 'No Pricing Test Customer',
      groundId: ground.id,
    })

    assert.equal(booking.amount, null)
    assert.equal(booking.pricing_slot_id, null)
  } finally {
    await cleanupGround(ground)
  }
})

test('price snapshot rule: a booking already created keeps its original price even after the owner edits the pricing slot afterward', async () => {
  const ground = await createGround('snapshot')
  try {
    const slot = await pricingService.createPricingSlot(ground, { startTime: '06:00', endTime: '09:00', price: 2000 }, null)

    const dateStr = tomorrowDateStr(3)
    const { booking } = await bookingService.createBooking({
      dateStr,
      hour: 6,
      minute: 0,
      customerName: 'Snapshot Test Customer',
      groundId: ground.id,
    })
    assert.equal(Number(booking.amount), 2000)

    // The owner changes the price of the SAME slot after the booking exists.
    await pricingService.updatePricingSlot(ground, slot.id, { price: 5000 }, null)

    const { rows } = await pool.query('SELECT amount, pricing_slot_id FROM ground_bookings WHERE id = $1', [booking.id])
    assert.equal(Number(rows[0].amount), 2000, 'a historical booking must never be dynamically recomputed from current pricing')
    assert.equal(rows[0].pricing_slot_id, slot.id, 'the FK link is traceability-only — it survives the edit, only the snapshot amount is authoritative')

    // Deleting the slot outright must not touch the historical amount either
    // (FK is ON DELETE SET NULL — traceability only, never authoritative).
    await pricingService.deletePricingSlot(ground, slot.id, null)
    const { rows: afterDelete } = await pool.query('SELECT amount, pricing_slot_id FROM ground_bookings WHERE id = $1', [booking.id])
    assert.equal(Number(afterDelete[0].amount), 2000, 'deleting the pricing slot must never alter a historical booking\'s locked-in amount')
    assert.equal(afterDelete[0].pricing_slot_id, null, 'FK correctly nulls out on delete, amount is unaffected')
  } finally {
    await cleanupGround(ground)
  }
})

// The customer-facing walk-in route (POST /bookings, GET /bookings/
// availability) predates ground_id entirely — every request silently
// booked the platform's single default ground. This is the fix: an
// optional publicGroundId now resolves to a real, ACTIVE ground
// server-side, so a booking made from a specific ground's page actually
// books THAT ground (and therefore prices against THAT ground's slots).
test('walk-in booking route: an explicit publicGroundId books the correct ground and prices against that ground\'s own pricing', async () => {
  const server = await startTestApp()
  const groundA = await createGround('http-a')
  const groundB = await createGround('http-b')
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,'not-a-real-hash','player') RETURNING *`,
    [`Integration Test HTTP Booker`, `pricing-http-booker-${uniqueTag()}@example.test`],
  )
  const token = signToken({ id: user.id, name: user.name })
  try {
    await pricingService.createPricingSlot(groundA, { startTime: '06:00', endTime: '09:00', price: 2000 }, null)
    await pricingService.createPricingSlot(groundB, { startTime: '06:00', endTime: '09:00', price: 9000 }, null)

    const dateStr = tomorrowDateStr(5)
    const res = await fetch(`${server.baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: dateStr, hour: 6, minute: 0, publicGroundId: groundA.public_ground_id }),
    })
    const body = await res.json()
    assert.equal(res.status, 201, JSON.stringify(body))
    const { booking } = body

    const { rows } = await pool.query('SELECT ground_id, amount FROM ground_bookings WHERE public_booking_id = $1', [booking.publicBookingId])
    assert.equal(rows[0].ground_id, groundA.id, 'the booking must belong to the ground named in publicGroundId, never the platform default')
    assert.equal(Number(rows[0].amount), 2000, 'price must come from the NAMED ground\'s own pricing, not any other ground\'s')

    const availRes = await fetch(`${server.baseUrl}/bookings/availability?date=${dateStr}&publicGroundId=${groundA.public_ground_id}`)
    assert.equal(availRes.status, 200)
    const availData = await availRes.json()
    const bookedSlot = availData.slots.find((s) => s.startTime === new Date(booking.startTime).toISOString())
    assert.equal(bookedSlot?.status, 'UNAVAILABLE', 'Ground A\'s own availability must reflect the booking just made against it')

    const unknownGroundRes = await fetch(`${server.baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: dateStr, hour: 8, minute: 0, publicGroundId: 'GRD-DOES-NOT-EXIST' }),
    })
    assert.equal(unknownGroundRes.status, 404, 'an unknown/invalid publicGroundId must be rejected, never silently fall back to the default ground')
  } finally {
    await pool.query('DELETE FROM ground_bookings WHERE user_id = $1', [user.id])
    await pool.query('DELETE FROM users WHERE id = $1', [user.id])
    await cleanupGround(groundA)
    await cleanupGround(groundB)
    await server.close()
  }
})
