import { pool } from '../config/db.js'

export async function createPartner({ name, logoUrl, websiteUrl = null, sortOrder = 0, cloudinaryPublicId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO partners (name, logo_url, website_url, sort_order, cloudinary_public_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, logoUrl, websiteUrl, sortOrder, cloudinaryPublicId]
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
