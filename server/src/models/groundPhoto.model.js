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
// public contract). is_featured (Ground Registration feature) IS part of
// that contract — it's what lets the public ground page split the exact-6
// slideshow from the gallery.
export async function findGroundPhotosByGroundId(groundId) {
  const { rows } = await pool.query(
    'SELECT title, image_url, sort_order, is_featured FROM ground_photos WHERE ground_id = $1 ORDER BY is_featured DESC, sort_order, created_at',
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

// Ground Registration feature — bulk-copies a request's staged photos into
// real, ground-scoped rows at approval time (groundOwnerRequest.service.js
// #approveRequest), preserving is_featured/sort_order exactly. `photos` —
// [{ imageUrl, cloudinaryPublicId, isFeatured, sortOrder }].
export async function insertMany(groundId, photos, client = pool) {
  if (!photos || photos.length === 0) return []
  const values = []
  const params = [groundId]
  photos.forEach((photo) => {
    const base = params.length
    params.push(photo.imageUrl, photo.cloudinaryPublicId, photo.isFeatured, photo.sortOrder)
    values.push(`($1, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`)
  })
  const { rows } = await client.query(
    `INSERT INTO ground_photos (ground_id, image_url, cloudinary_public_id, is_featured, sort_order)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params,
  )
  return rows
}
