import { pool } from '../config/db.js'

// Phase 8 — the first table in the multi-ground architecture (Phase 7
// audit §7-9). Minimal by design: this phase seeds exactly one real ground
// and stops there — no controller/route touches this file yet (that's a
// separate, later phase). Matches the established minimal model shape
// (groundPhoto.model.js, amenity.model.js, partner.model.js).

export async function createGround({
  publicGroundId,
  slug,
  name,
  description = null,
  addressLine = null,
  city = null,
  state = null,
  country = 'India',
  postalCode = null,
  latitude = null,
  longitude = null,
  phone = null,
  email = null,
  website = null,
  status = 'DRAFT',
}) {
  const { rows } = await pool.query(
    `INSERT INTO grounds
       (public_ground_id, slug, name, description, address_line, city, state,
        country, postal_code, latitude, longitude, phone, email, website, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [publicGroundId, slug, name, description, addressLine, city, state, country, postalCode, latitude, longitude, phone, email, website, status],
  )
  return rows[0]
}

export async function findGroundBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM grounds WHERE slug = $1', [slug])
  return rows[0] || null
}

export async function findGroundById(id) {
  const { rows } = await pool.query('SELECT * FROM grounds WHERE id = $1', [id])
  return rows[0] || null
}

// Phase 9 — how the authorization middleware resolves a route's
// :publicGroundId param (never trusted as-is — see groundAccess.js) to the
// real ground row.
export async function findGroundByPublicId(publicGroundId) {
  const { rows } = await pool.query('SELECT * FROM grounds WHERE public_ground_id = $1', [publicGroundId])
  return rows[0] || null
}

export async function findAllGrounds() {
  const { rows } = await pool.query('SELECT * FROM grounds ORDER BY id')
  return rows
}
