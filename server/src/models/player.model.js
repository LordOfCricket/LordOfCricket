import { pool } from '../config/db.js'

export async function createPlayer({ name, teamId, role, battingStyle = null, bowlingStyle = null }) {
  const { rows } = await pool.query(
    `INSERT INTO players (name, team_id, role, batting_style, bowling_style)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, teamId, role, battingStyle, bowlingStyle]
  )
  return rows[0]
}

export async function findPlayerById(id) {
  const { rows } = await pool.query('SELECT * FROM players WHERE id = $1', [id])
  return rows[0] || null
}

export async function findPlayersByTeam(teamId) {
  const { rows } = await pool.query(
    'SELECT * FROM players WHERE team_id = $1 ORDER BY id',
    [teamId]
  )
  return rows
}

export async function findAllPlayers() {
  const { rows } = await pool.query('SELECT * FROM players ORDER BY id')
  return rows
}

export async function updatePlayer(id, fields) {
  const keys = Object.keys(fields)
  if (keys.length === 0) return findPlayerById(id)

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE players SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...keys.map((key) => fields[key])]
  )
  return rows[0] || null
}

export async function deletePlayer(id) {
  await pool.query('DELETE FROM players WHERE id = $1', [id])
}
