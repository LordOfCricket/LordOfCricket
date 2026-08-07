import { pool } from '../config/db.js'

export async function createUmpireRequest(userId) {
  const { rows } = await pool.query(
    `INSERT INTO umpire_requests (user_id)
     VALUES ($1)
     RETURNING id, user_id, status, requested_at, decided_at, decided_by`,
    [userId]
  )
  return rows[0]
}

export async function findLatestUmpireRequestForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, status, requested_at, decided_at, decided_by
     FROM umpire_requests WHERE user_id = $1
     ORDER BY requested_at DESC LIMIT 1`,
    [userId]
  )
  return rows[0] || null
}

export async function findPendingUmpireRequests() {
  const { rows } = await pool.query(
    `SELECT ur.id, ur.user_id, ur.status, ur.requested_at, u.name, u.email
     FROM umpire_requests ur
     JOIN users u ON u.id = ur.user_id
     WHERE ur.status = 'pending'
     ORDER BY ur.requested_at ASC`
  )
  return rows
}

export async function decideUmpireRequest(id, status, decidedBy) {
  const { rows } = await pool.query(
    `UPDATE umpire_requests
     SET status = $2, decided_at = NOW(), decided_by = $3
     WHERE id = $1
     RETURNING id, user_id, status, requested_at, decided_at, decided_by`,
    [id, status, decidedBy]
  )
  return rows[0] || null
}
