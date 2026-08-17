import { pool } from '../config/db.js'

// staff_role is resolved via a LEFT JOIN so it is always present (null for
// non-staff users, and null for a staff row with no staff_role_id assigned
// yet) without ever needing a second query.
//
// Phase 3 — `phone` and `status` are included here deliberately: every
// consumer of `req.user` across the app (67 call sites) reads from
// whatever this SELECT returns, so both auth paths (legacy JWT and the new
// session-cookie path) converging on this same function is what guarantees
// req.user has an identical shape regardless of which one authenticated
// the request.
const PUBLIC_COLUMNS = 'u.id, u.name, u.email, u.phone, u.role, u.player_type, u.staff_id, u.status, u.created_at, sr.name AS staff_role'
const FROM_USERS = 'users u LEFT JOIN staff_roles sr ON sr.id = u.staff_role_id'

export async function createUser({ name, email, passwordHash, role = 'user' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, player_type, staff_id, created_at, NULL::text AS staff_role`,
    [name, email, passwordHash, role]
  )
  return rows[0]
}

// Phase 6 — accepts an optional transaction client (default `pool`) so
// staff.controller.js#createStaff can consume a step-up grant and create
// the account atomically (same reasoning as every other transaction-aware
// model function in this codebase).
export async function createStaffUser({ name, email, passwordHash, staffId, staffRoleId }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, role, staff_id, staff_role_id)
     VALUES ($1, $2, $3, 'staff', $4, $5)
     RETURNING id`,
    [name, email, passwordHash, staffId || null, staffRoleId]
  )
  return findUserById(rows[0].id, client)
}

// Phase 4 — every function below takes an optional trailing transaction
// client (default `pool`), threaded through to any internal calls too
// (e.g. createUserFromOtp's own findUserById) — using the module-level pool
// for a read inside an uncommitted transaction on a different connection
// would not see the just-inserted row. Existing callers that never pass a
// client are completely unaffected.
export async function findUserById(id, client = pool) {
  const { rows } = await client.query(
    `SELECT ${PUBLIC_COLUMNS} FROM ${FROM_USERS} WHERE u.id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function findUserByEmail(email, client = pool) {
  const { rows } = await client.query(
    `SELECT u.*, sr.name AS staff_role FROM ${FROM_USERS} WHERE u.email = $1`,
    [email]
  )
  return rows[0] || null
}

export async function findUserByPhone(phone, client = pool) {
  const { rows } = await client.query(
    `SELECT u.*, sr.name AS staff_role FROM ${FROM_USERS} WHERE u.phone = $1`,
    [phone]
  )
  return rows[0] || null
}

// Phase 3 — the one lookup the OTP login flow needs: "does a user already
// exist for this identifier" regardless of whether it's an email or a
// phone number. Returns the same full-row shape as findUserByEmail (incl.
// password_hash — callers that don't need it use toPublicUser, same as the
// existing login/signup controllers already do).
export async function findUserByIdentifier(identifier, identifierType, client = pool) {
  return identifierType === 'PHONE' ? findUserByPhone(identifier, client) : findUserByEmail(identifier, client)
}

// Phase 3 — OTP-only signup: no password, identified by whichever of
// email/phone the user actually entered. role defaults to 'user' (not yet
// chosen), exactly matching createUser()'s existing default for password
// signups — the post-auth role-selection flow (roleRedirect.model.js) is
// unchanged and applies identically to both.
export async function createUserFromOtp({ identifier, identifierType, name, role = 'user', playerType = null, staffRoleId = null }, client = pool) {
  const emailValue = identifierType === 'EMAIL' ? identifier : null
  const phoneValue = identifierType === 'PHONE' ? identifier : null
  const { rows } = await client.query(
    `INSERT INTO users (name, email, phone, password_hash, role, player_type, staff_role_id)
     VALUES ($1, $2, $3, NULL, $4, $5, $6)
     RETURNING id`,
    [name, emailValue, phoneValue, role, playerType, staffRoleId]
  )
  return findUserById(rows[0].id, client)
}

export async function findAllUsers() {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM ${FROM_USERS} ORDER BY u.id`
  )
  return rows
}

export async function updateUser(id, fields) {
  const keys = Object.keys(fields)
  if (keys.length === 0) return findUserById(id)

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ')
  await pool.query(
    `UPDATE users SET ${setClause} WHERE id = $1`,
    [id, ...keys.map((key) => fields[key])]
  )
  return findUserById(id)
}

export async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id])
}
