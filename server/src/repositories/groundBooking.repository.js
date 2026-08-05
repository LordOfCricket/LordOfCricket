import { pool } from '../config/db.js'

export async function insertBooking(client, {
  publicBookingId, bookingType = 'CUSTOMER', userId = null, customerName, contactPhone = null, contactEmail = null,
  startTime, endTime, purpose = null, expectedPlayers = null, notes = null, clientActionId = null, createdByStaffId = null,
  googleSyncStatus = 'PENDING', blockType = null,
}) {
  const { rows } = await client.query(
    `INSERT INTO ground_bookings (
       public_booking_id, booking_type, user_id, customer_name, contact_phone, contact_email,
       start_time, end_time, purpose, expected_players, notes, client_action_id, created_by_staff_id, google_sync_status, block_type
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [publicBookingId, bookingType, userId, customerName, contactPhone, contactEmail, startTime, endTime, purpose, expectedPlayers, notes, clientActionId, createdByStaffId, googleSyncStatus, blockType]
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
    `SELECT id, public_booking_id, booking_type, block_type, start_time, end_time, purpose
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

// ---------------------------------------------------------------------------
// Phase 18 — Ground Operations additions. Read-only extensions of the same
// existing tables (`ground_bookings`, `matches` + `tournament_fixtures`/
// `tournaments`) — no new occupancy source, no new concurrency mechanism.
// ---------------------------------------------------------------------------

/** Every CONFIRMED staff block (Feature 3/15) whose range intersects [fromUtc, toUtc). */
export async function listBlocksInRange(fromUtc, toUtc) {
  const { rows } = await pool.query(
    `SELECT * FROM ground_bookings
     WHERE booking_type = 'STAFF_BLOCK' AND status = 'CONFIRMED' AND start_time < $2 AND end_time > $1
     ORDER BY start_time`,
    [fromUtc, toUtc]
  )
  return rows
}

/**
 * Every live/upcoming LOC match (friendly, practice, or tournament fixture —
 * Feature 13/14 treat them identically, same as the existing
 * `listMatchDatesInRange`) in the given ground-local date range, WITH team
 * names and (when tournament-linked) tournament/stage context, for the
 * timeline/dashboard to render a real label instead of a bare whole-day flag.
 * Still a whole-day occupancy signal (Part 37's documented reason: match_date
 * has no end time) — this only enriches the LABEL, never fabricates a
 * narrower time range.
 */
export async function listMatchEntriesInRange(fromDateStr, toDateStrExclusive) {
  const { rows } = await pool.query(
    `SELECT m.id, m.match_date, m.status, m.venue,
            ta.name AS team_a_name, tb.name AS team_b_name,
            f.stage, t.public_tournament_id AS tournament_public_id, t.name AS tournament_name
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN tournament_fixtures f ON f.match_id = m.id
     LEFT JOIN tournaments t ON t.id = f.tournament_id
     WHERE m.status IN ('upcoming', 'live') AND m.match_date::date >= $1::date AND m.match_date::date < $2::date
     ORDER BY m.match_date`,
    [fromDateStr, toDateStrExclusive]
  )
  return rows
}

/**
 * Booking History (Feature 10) — search/filter/sort/paginate over every
 * booking+block, staff-only. `q` matches customer name or purpose
 * (case-insensitive substring); `status`/`bookingType` are exact filters.
 * `COUNT(*) OVER()` gives the total for pagination in one round trip (same
 * pattern `team.repository.js#listPublicTeams` already uses).
 */
export async function searchBookings({ q = null, status = null, bookingType = null, fromUtc = null, toUtc = null, limit = 20, offset = 0 }) {
  const { rows } = await pool.query(
    `SELECT *, COUNT(*) OVER()::int AS total_count
     FROM ground_bookings
     WHERE ($1::text IS NULL OR customer_name ILIKE '%' || $1 || '%' OR purpose ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR status = $2)
       AND ($3::text IS NULL OR booking_type = $3)
       AND ($4::timestamptz IS NULL OR start_time >= $4)
       AND ($5::timestamptz IS NULL OR start_time < $5)
     ORDER BY start_time DESC
     LIMIT $6 OFFSET $7`,
    [q, status, bookingType, fromUtc, toUtc, limit, offset]
  )
  const total = rows.length ? rows[0].total_count : 0
  return { rows, total }
}

/** Bookings-by-date count (Feature 11 "Busy Days"), CUSTOMER bookings only, CONFIRMED, in ground-local calendar dates. */
export async function countBookingsByDate(fromUtc, toUtc, groundTimezone) {
  const { rows } = await pool.query(
    `SELECT to_char(start_time AT TIME ZONE $3, 'YYYY-MM-DD') AS date_str, COUNT(*)::int AS count
     FROM ground_bookings
     WHERE status = 'CONFIRMED' AND booking_type = 'CUSTOMER' AND start_time >= $1 AND start_time < $2
     GROUP BY 1
     ORDER BY count DESC, date_str ASC`,
    [fromUtc, toUtc, groundTimezone]
  )
  return rows
}

/** Bookings-by-hour-of-day count (Feature 11 "Peak Hours"), ground-local hour. */
export async function countBookingsByHour(fromUtc, toUtc, groundTimezone) {
  const { rows } = await pool.query(
    `SELECT EXTRACT(HOUR FROM start_time AT TIME ZONE $3)::int AS hour, COUNT(*)::int AS count
     FROM ground_bookings
     WHERE status = 'CONFIRMED' AND booking_type = 'CUSTOMER' AND start_time >= $1 AND start_time < $2
     GROUP BY 1
     ORDER BY count DESC, hour ASC`,
    [fromUtc, toUtc, groundTimezone]
  )
  return rows
}

/** Simple status-count breakdown for a date range (Feature 11 "Bookings/Completed/Cancelled"). */
export async function countBookingsByStatus(fromUtc, toUtc) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM ground_bookings
     WHERE booking_type = 'CUSTOMER' AND start_time >= $1 AND start_time < $2
     GROUP BY 1`,
    [fromUtc, toUtc]
  )
  return rows
}

/** Sum of booked/blocked hours in a range, for utilization (Feature 12) — CONFIRMED rows only, split by booking_type. */
export async function sumOccupiedHoursByType(fromUtc, toUtc) {
  const { rows } = await pool.query(
    `SELECT booking_type, COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)::float AS hours
     FROM ground_bookings
     WHERE status = 'CONFIRMED' AND start_time >= $1 AND start_time < $2
     GROUP BY 1`,
    [fromUtc, toUtc]
  )
  return rows
}
