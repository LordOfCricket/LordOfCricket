import { pool } from '../config/db.js'

// Storage layer for the Merchandise showcase — plain parameterized SQL,
// same role/shape as partner.model.js / advertisement.model.js (Cloudinary
// URL + metadata in Postgres, image bytes stay in Cloudinary).
export const MERCHANDISE_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']

// Statuses a public homepage visitor is allowed to see. OUT_OF_STOCK is
// still shown (with a badge) — it's a product people can discover, just not
// buy yet. DRAFT / INACTIVE are admin-only.
export const PUBLIC_MERCHANDISE_STATUSES = ['ACTIVE', 'OUT_OF_STOCK']

export async function createMerchandise({
  name,
  description = null,
  category = null,
  imageUrl,
  cloudinaryPublicId = null,
  originalPrice = null,
  sellingPrice,
  status = 'DRAFT',
  sortOrder = 0,
}) {
  const { rows } = await pool.query(
    `INSERT INTO merchandise
       (name, description, category, image_url, cloudinary_public_id,
        original_price, selling_price, status, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [name, description, category, imageUrl, cloudinaryPublicId, originalPrice, sellingPrice, status, sortOrder],
  )
  return rows[0]
}

// Public-facing (MerchandiseSection.jsx) — only visible statuses.
export async function findPublicMerchandise() {
  const { rows } = await pool.query(
    `SELECT * FROM merchandise
     WHERE status = ANY($1)
     ORDER BY sort_order, created_at`,
    [PUBLIC_MERCHANDISE_STATUSES],
  )
  return rows
}

// Admin-facing (Merchandise management page) — every product, any status.
export async function findAllMerchandise() {
  const { rows } = await pool.query('SELECT * FROM merchandise ORDER BY sort_order, created_at')
  return rows
}

export async function findMerchandiseById(id) {
  const { rows } = await pool.query('SELECT * FROM merchandise WHERE id = $1', [id])
  return rows[0] || null
}

// Generic column-map UPDATE, mirroring partner.model.js#updatePartner —
// bumps updated_at automatically so no caller has to remember to.
export async function updateMerchandise(id, fields) {
  const keys = Object.keys(fields)
  if (keys.length === 0) return findMerchandiseById(id)
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE merchandise SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...keys.map((key) => fields[key])],
  )
  return rows[0] || null
}

export async function deleteMerchandise(id) {
  const { rows } = await pool.query('DELETE FROM merchandise WHERE id = $1 RETURNING *', [id])
  return rows[0] || null
}
