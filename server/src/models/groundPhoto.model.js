import { pool } from '../config/db.js'

// Phase 12 — ground_id is now NOT NULL (schema.sql), backfilled to the
// single existing ground. Resolved server-side via findSingleGround() at
// the controller layer (mirrors canteen_id's Phase 10 treatment) — never
// client-supplied.
export async function createGroundPhoto({ groundId, title = null, imageUrl, sortOrder = 0, cloudinaryPublicId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO ground_photos (ground_id, title, image_url, sort_order, cloudinary_public_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [groundId, title, imageUrl, sortOrder, cloudinaryPublicId]
  )
  return rows[0]
}

export async function findAllGroundPhotos() {
  const { rows } = await pool.query(
    'SELECT * FROM ground_photos ORDER BY sort_order, created_at'
  )
  return rows
}

// Phase 12 Step 15 — the public ground profile's explicit ground boundary:
// "never SELECT all photos." Explicit column list, no internal id/
// cloudinary_public_id/created_at (Step 2/22 — those aren't part of the
// public contract).
export async function findGroundPhotosByGroundId(groundId) {
  const { rows } = await pool.query(
    'SELECT title, image_url, sort_order FROM ground_photos WHERE ground_id = $1 ORDER BY sort_order, created_at',
    [groundId],
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
