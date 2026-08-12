import { pool } from '../config/db.js'

// Phase 9 — ground-scoped authorization storage. No public_id: like
// match_players/tournament_teams (schema.sql), this is an internal
// membership/join row, never addressed directly by its own API resource.

export async function createMembership({ groundId, userId, role, isActive = true }) {
  const { rows } = await pool.query(
    `INSERT INTO ground_users (ground_id, user_id, role, is_active)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [groundId, userId, role, isActive],
  )
  return rows[0]
}

// The authorization primitive: is there an ACTIVE grant for this exact
// (user, ground, role)? Deliberately narrow (single role, not "any of these
// roles") so callers compose it explicitly rather than hide role lists here.
export async function findActiveMembership(userId, groundId, role) {
  const { rows } = await pool.query(
    `SELECT * FROM ground_users WHERE user_id = $1 AND ground_id = $2 AND role = $3 AND is_active = true`,
    [userId, groundId, role],
  )
  return rows[0] || null
}

// Used by the authorization middleware (groundAccess.js) for "does this user
// hold ANY of these roles at this ground" checks — one query instead of the
// caller looping findActiveMembership() per candidate role.
export async function findActiveMembershipForAnyRole(userId, groundId, roles) {
  const { rows } = await pool.query(
    `SELECT * FROM ground_users
     WHERE user_id = $1 AND ground_id = $2 AND role = ANY($3::varchar[]) AND is_active = true
     LIMIT 1`,
    [userId, groundId, roles],
  )
  return rows[0] || null
}

export async function findMembershipsByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM ground_users WHERE user_id = $1 ORDER BY id', [userId])
  return rows
}

export async function findMembershipsByGroundId(groundId) {
  const { rows } = await pool.query('SELECT * FROM ground_users WHERE ground_id = $1 ORDER BY id', [groundId])
  return rows
}

// U5 — the Ground Owner Dashboard's ground list: every ACTIVE membership
// row for this role, joined out to the real ground row. No uniqueness
// constraint restricts a user to one GROUND_OWNER row (confirmed by
// inspecting the schema before this phase) — one owner legitimately
// managing several grounds is already fully supported, not a new case to
// design around.
// U7 — the inverse of findGroundsOwnedByUser: every user actively holding
// GROUND_OWNER for a given ground (there is no uniqueness constraint on
// ground_id alone in ground_users, so more than one legitimate co-owner is
// already representable — this returns all of them, not just one).
export async function findActiveGroundOwnerUserIds(groundId) {
  const { rows } = await pool.query(
    `SELECT user_id FROM ground_users WHERE ground_id = $1 AND role = 'GROUND_OWNER' AND is_active = true`,
    [groundId],
  )
  return rows.map((r) => r.user_id)
}

export async function findGroundsOwnedByUser(userId, role = 'GROUND_OWNER') {
  const { rows } = await pool.query(
    `SELECT g.*
     FROM ground_users gu
     JOIN grounds g ON g.id = gu.ground_id
     WHERE gu.user_id = $1 AND gu.role = $2 AND gu.is_active = true
     ORDER BY g.name`,
    [userId, role],
  )
  return rows
}

export async function setMembershipActive(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE ground_users SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, isActive],
  )
  return rows[0] || null
}
