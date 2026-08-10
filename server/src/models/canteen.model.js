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
