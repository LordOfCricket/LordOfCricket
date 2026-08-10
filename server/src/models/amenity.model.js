import { pool } from '../config/db.js'

export async function createAmenity({ name, imageUrl, sortOrder = 0, cloudinaryPublicId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO amenities (name, image_url, sort_order, cloudinary_public_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, imageUrl, sortOrder, cloudinaryPublicId]
  )
  return rows[0]
}

export async function findAllAmenities() {
  const { rows } = await pool.query(
    'SELECT * FROM amenities ORDER BY sort_order, created_at'
  )
  return rows
}

export async function deleteAmenity(id) {
  const { rows } = await pool.query(
    'DELETE FROM amenities WHERE id = $1 RETURNING *',
    [id]
  )
  return rows[0] || null
}
