import { pool } from '../config/db.js'

const PUBLIC_COLUMNS = 'id, name, email, role, player_type, created_at'

export async function createUser({ name, email, passwordHash, role = 'user' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role]
  )
  return rows[0]
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return rows[0] || null
}

export async function findAllUsers() {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id`
  )
  return rows
}

export async function updateUser(id, fields) {
  const keys = Object.keys(fields)
  if (keys.length === 0) return findUserById(id)

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE users SET ${setClause} WHERE id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    [id, ...keys.map((key) => fields[key])]
  )
  return rows[0] || null
}

export async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id])
}
