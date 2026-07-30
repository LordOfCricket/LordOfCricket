import { pool } from '../config/db.js'

export async function createMatch({ teamAId, teamBId, venue, matchDate, status = 'upcoming' }) {
  const { rows } = await pool.query(
    `INSERT INTO matches (team_a_id, team_b_id, venue, match_date, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [teamAId, teamBId, venue, matchDate, status]
  )
  return rows[0]
}

export async function findMatchById(id) {
  const { rows } = await pool.query('SELECT * FROM matches WHERE id = $1', [id])
  return rows[0] || null
}

export async function findAllMatches() {
  const { rows } = await pool.query('SELECT * FROM matches ORDER BY match_date DESC')
  return rows
}

export async function findAllMatchesWithTeams() {
  const { rows } = await pool.query(`
    SELECT
      m.*,
      ta.name AS team_a_name, ta.short_name AS team_a_short,
      tb.name AS team_b_name, tb.short_name AS team_b_short
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    ORDER BY m.match_date DESC
  `)
  return rows
}

const FEATURED_MATCH_COLUMNS = `
  m.*,
  ta.name AS team_a_name, ta.short_name AS team_a_short, ta.logo_url AS team_a_logo,
  tb.name AS team_b_name, tb.short_name AS team_b_short, tb.logo_url AS team_b_logo
`

export async function findFeaturedMatch() {
  const { rows: liveRows } = await pool.query(`
    SELECT ${FEATURED_MATCH_COLUMNS}
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'live'
    ORDER BY m.match_date DESC
    LIMIT 1
  `)
  if (liveRows[0]) return liveRows[0]

  const { rows: upcomingRows } = await pool.query(`
    SELECT ${FEATURED_MATCH_COLUMNS}
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'upcoming'
    ORDER BY m.match_date ASC
    LIMIT 1
  `)
  return upcomingRows[0] || null
}

export async function findMatchesByStatus(status) {
  const { rows } = await pool.query(
    'SELECT * FROM matches WHERE status = $1 ORDER BY match_date DESC',
    [status]
  )
  return rows
}

export async function updateMatch(id, fields) {
  const keys = Object.keys(fields)
  if (keys.length === 0) return findMatchById(id)

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE matches SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...keys.map((key) => fields[key])]
  )
  return rows[0] || null
}

export async function deleteMatch(id) {
  await pool.query('DELETE FROM matches WHERE id = $1', [id])
}
