import { pool } from '../config/db.js'

export async function createGroundPhoto({ title = null, imageUrl, sortOrder = 0 }) {
  const { rows } = await pool.query(
    `INSERT INTO ground_photos (title, image_url, sort_order)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [title, imageUrl, sortOrder]
  )
  return rows[0]
}

export async function findAllGroundPhotos() {
  const { rows } = await pool.query(
    'SELECT * FROM ground_photos ORDER BY sort_order, created_at'
  )
  return rows
}

export async function deleteGroundPhoto(id) {
  const { rows } = await pool.query(
    'DELETE FROM ground_photos WHERE id = $1 RETURNING *',
    [id]
  )
  return rows[0] || null
}
