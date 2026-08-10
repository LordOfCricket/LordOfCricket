import { pool } from '../config/db.js'

// Phase 8 — the second table in the multi-ground architecture (Phase 7
// audit §7-9). menu_items/today_menu/orders do NOT reference this table
// yet (deliberately, out of scope this phase) — this only creates the
// parent row(s) for a later phase to point at.

export async function createCanteen({ groundId, publicCanteenId, name = 'Main Canteen', isActive = true }) {
  const { rows } = await pool.query(
    `INSERT INTO canteens (ground_id, public_canteen_id, name, is_active)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [groundId, publicCanteenId, name, isActive],
  )
  return rows[0]
}

export async function findCanteensByGroundId(groundId) {
  const { rows } = await pool.query('SELECT * FROM canteens WHERE ground_id = $1 ORDER BY id', [groundId])
  return rows
}

export async function findCanteenById(id) {
  const { rows } = await pool.query('SELECT * FROM canteens WHERE id = $1', [id])
  return rows[0] || null
}

// Phase 9 — resolves a route's :publicCanteenId param to the real canteen
// row so its ground_id can be authorized against, never taken from the
// client (see groundAccess.js's requireCanteenRole).
export async function findCanteenByPublicId(publicCanteenId) {
  const { rows } = await pool.query('SELECT * FROM canteens WHERE public_canteen_id = $1', [publicCanteenId])
  return rows[0] || null
}

// Phase 10 — resolves "the" canteen for the current single-ground/single-
// canteen environment (Phase 8: exactly one of each exists today). Every
// existing canteen route is flat (/api/canteen/menu, /api/canteen/orders —
// no :publicCanteenId in the URL at all), so redesigning the URL scheme to
// carry an explicit canteen id is out of this phase's scope (that's the
// ground-discovery/multi-canteen-selection UI, a later phase). Step 24
// explicitly allows resolving the canteen dynamically like this for now.
export async function findSingleCanteen() {
  const { rows } = await pool.query('SELECT * FROM canteens ORDER BY id LIMIT 1')
  return rows[0] || null
}
