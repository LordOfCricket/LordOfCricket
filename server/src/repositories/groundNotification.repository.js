import { pool } from '../config/db.js'

// Phase 18 Feature 17 — in-app notifications only (no email/SMS — explicitly
// out of scope). One row per addressed notification.

// relatedMatchId (Phase 21/U7) mirrors relatedBookingId — a second,
// separate nullable FK rather than overloading the booking one, matching
// how the column was added to the schema in U1.
export async function insertNotification(client, { userId, type, title, body = null, relatedBookingId = null, relatedMatchId = null }) {
  const { rows } = await client.query(
    `INSERT INTO ground_notifications (user_id, type, title, body, related_booking_id, related_match_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userId, type, title, body, relatedBookingId, relatedMatchId]
  )
  return rows[0]
}

export async function listForUser(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT *, COUNT(*) OVER()::int AS total_count
     FROM ground_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  const total = rows.length ? rows[0].total_count : 0
  return { rows, total }
}

export async function countUnread(userId) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ground_notifications WHERE user_id = $1 AND is_read = false`, [userId])
  return rows[0].count
}

export async function markRead(id, userId) {
  const { rows } = await pool.query(`UPDATE ground_notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`, [id, userId])
  return rows[0] || null
}

export async function markAllRead(userId) {
  await pool.query(`UPDATE ground_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [userId])
}
