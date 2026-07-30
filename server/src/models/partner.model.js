import { pool } from '../config/db.js'

export async function createPartner({ name, logoUrl, websiteUrl = null, sortOrder = 0 }) {
  const { rows } = await pool.query(
    `INSERT INTO partners (name, logo_url, website_url, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, logoUrl, websiteUrl, sortOrder]
  )
  return rows[0]
}

export async function findAllPartners() {
  const { rows } = await pool.query('SELECT * FROM partners ORDER BY sort_order, created_at')
  return rows
}

export async function deletePartner(id) {
  const { rows } = await pool.query('DELETE FROM partners WHERE id = $1 RETURNING *', [id])
  return rows[0] || null
}
