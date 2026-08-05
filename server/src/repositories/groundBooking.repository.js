import { pool } from '../config/db.js'

export async function insertBooking(client, {
  publicBookingId, bookingType = 'CUSTOMER', userId = null, customerName, contactPhone = null, contactEmail = null,
  startTime, endTime, purpose = null, expectedPlayers = null, notes = null, clientActionId = null, createdByStaffId = null,
  googleSyncStatus = 'PENDING',
}) {
  const { rows } = await client.query(
    `INSERT INTO ground_bookings (
       public_booking_id, booking_type, user_id, customer_name, contact_phone, contact_email,
       start_time, end_time, purpose, expected_players, notes, client_action_id, created_by_staff_id, google_sync_status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [publicBookingId, bookingType, userId, customerName, contactPhone, contactEmail, startTime, endTime, purpose, expectedPlayers, notes, clientActionId, createdByStaffId, googleSyncStatus]
  )
  return rows[0]
}

export async function findByClientActionId(clientActionId, client = pool) {
  if (!clientActionId) return null
  const { rows } = await client.query('SELECT * FROM ground_bookings WHERE client_action_id = $1', [clientActionId])
  return rows[0] || null
}

export async function findByPublicId(publicBookingId) {
  const { rows } = await pool.query('SELECT * FROM ground_bookings WHERE public_booking_id = $1', [publicBookingId])
  return rows[0] || null
}

export async function findById(id, client = pool) {
  const { rows } = await client.query('SELECT * FROM ground_bookings WHERE id = $1', [id])
  return rows[0] || null
}

/** Every CONFIRMED booking/block (customer + staff) whose range intersects
 * [fromUtc, toUtc) — the raw occupancy data the availability domain layer
 * turns into AVAILABLE/UNAVAILABLE slots. */
export async function listConfirmedInRange(fromUtc, toUtc) {
  const { rows } = await pool.query(
    `SELECT id, public_booking_id, booking_type, start_time, end_time, purpose
     FROM ground_bookings
     WHERE status = 'CONFIRMED' AND start_time < $2 AND end_time > $1
     ORDER BY start_time`,
    [fromUtc, toUtc]
  )
  return rows
}

export async function listByUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM ground_bookings WHERE user_id = $1 AND booking_type = 'CUSTOMER' ORDER BY start_time DESC`,
    [userId]
  )
  return rows
}

export async function listForStaffSchedule({ fromUtc, toUtc } = {}) {
  const conditions = []
  const params = []
  if (fromUtc) {
    params.push(fromUtc)
    conditions.push(`start_time >= $${params.length}`)
  }
  if (toUtc) {
    params.push(toUtc)
    conditions.push(`start_time < $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(`SELECT * FROM ground_bookings ${where} ORDER BY start_time`, params)
  return rows
}

export async function cancelBooking(id, client = pool) {
  const { rows } = await client.query(
    `UPDATE ground_bookings SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'CONFIRMED' RETURNING *`,
    [id]
  )
  return rows[0] || null
}

export async function updateGoogleSync(id, { eventId, status }) {
  const { rows } = await pool.query(
    `UPDATE ground_bookings SET google_calendar_event_id = COALESCE($2, google_calendar_event_id), google_sync_status = $3, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, eventId ?? null, status]
  )
  return rows[0] || null
}

/** Distinct ground-local calendar dates (as 'YYYY-MM-DD') that have a
 * live/upcoming LOC match — Part 37: match_date is the only scheduling
 * column on `matches` (a plain TIMESTAMP with no timezone and no end time,
 * per docs/ARCHITECTURE.md), so this is a whole-day occupancy signal, never
 * a fabricated time range. `matches.match_date` is entered via a
 * `datetime-local` form field with no timezone conversion anywhere in the
 * app (confirmed by audit), so its stored naive value already IS the
 * ground-local wall-clock date/time as typed by whoever created the match —
 * taking its date component directly (no offset arithmetic) is the correct
 * reading of the existing data, not an assumption layered on top of it.
 * `fromUtc`/`toUtc` are still real UTC instants (the booking horizon window);
 * `fromDateStr`/`toDateStrExclusive` are plain 'YYYY-MM-DD' ground-local date
 * strings, compared directly against the naive column with no implicit
 * UTC/local conversion by the driver either way — the safest choice given
 * the column's already-ambiguous timezone semantics. */
export async function listMatchDatesInRange(fromDateStr, toDateStrExclusive) {
  const { rows } = await pool.query(
    `SELECT DISTINCT to_char(match_date, 'YYYY-MM-DD') AS date_str
     FROM matches
     WHERE status IN ('upcoming', 'live') AND match_date::date >= $1::date AND match_date::date < $2::date`,
    [fromDateStr, toDateStrExclusive]
  )
  return rows.map((r) => r.date_str)
}
