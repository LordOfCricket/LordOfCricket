import { pool } from '../config/db.js'

// staff_role is resolved via a LEFT JOIN so it is always present (null for
// non-staff users, and null for a staff row with no staff_role_id assigned
// yet) without ever needing a second query.
const PUBLIC_COLUMNS = 'u.id, u.name, u.email, u.role, u.player_type, u.staff_id, u.created_at, sr.name AS staff_role'
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

export async function createStaffUser({ name, email, passwordHash, staffId, staffRoleId }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, staff_id, staff_role_id)
     VALUES ($1, $2, $3, 'staff', $4, $5)
     RETURNING id`,
    [name, email, passwordHash, staffId || null, staffRoleId]
  )
  return findUserById(rows[0].id)
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM ${FROM_USERS} WHERE u.id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.*, sr.name AS staff_role FROM ${FROM_USERS} WHERE u.email = $1`,
    [email]
  )
  return rows[0] || null
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
