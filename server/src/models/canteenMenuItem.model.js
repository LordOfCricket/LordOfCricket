import { pool } from '../config/db.js'

// MongoDB cleanup, Phase 3 — MenuItem's storage layer, migrated from
// Mongoose to plain parameterized SQL. TodayMenu and Order stay on
// MongoDB this phase — this file has zero knowledge of either; the
// controller layer is the only place that coordinates across both stores.
// The retired Mongoose model (canteenMenuItemMongoLegacy.model.js) is kept
// only for the one-time data migration script and rollback reference.

const UPDATABLE_COLUMNS = {
  name: 'name',
  category: 'category',
  description: 'description',
  price: 'price',
  imageUrl: 'image_url',
  cloudinaryPublicId: 'cloudinary_public_id',
  defaultStock: 'default_stock',
  isActive: 'is_active',
}

export async function insertMenuItem({
  name,
  category,
  description = '',
  price,
  imageUrl = '',
  cloudinaryPublicId = '',
  defaultStock = 0,
}) {
  const { rows } = await pool.query(
    `INSERT INTO menu_items (name, category, description, price, image_url, cloudinary_public_id, default_stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [name, category, description, price, imageUrl, cloudinaryPublicId, defaultStock],
  )
  return rows[0]
}

// "Active items" — the public menu / master menu listing query.
export async function findActiveMenuItems() {
  const { rows } = await pool.query('SELECT * FROM menu_items WHERE is_active = true ORDER BY id')
  return rows
}

// ALL items regardless of is_active — matches the retired Mongoose code's
// own `MenuItem.find().lean()` (no filter) used only to validate which ids
// `updateTodaysMenu` is allowed to reference. Deliberately a separate
// function from findActiveMenuItems, not a parameter, so each call site's
// intent stays obvious at the call site.
export async function findAllMenuItems() {
  const { rows } = await pool.query('SELECT * FROM menu_items ORDER BY id')
  return rows
}

export async function findMenuItemById(id) {
  const { rows } = await pool.query('SELECT * FROM menu_items WHERE id = $1', [id])
  return rows[0] || null
}

export async function updateMenuItemById(id, updates) {
  const setParts = []
  const values = []
  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (updates[field] === undefined) continue
    values.push(updates[field])
    setParts.push(`${column} = $${values.length}`)
  }
  if (setParts.length === 0) return findMenuItemById(id)

  values.push(id)
  const { rows } = await pool.query(
    `UPDATE menu_items SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values,
  )
  return rows[0] || null
}

export async function deactivateMenuItemById(id) {
  const { rows } = await pool.query(
    `UPDATE menu_items SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  )
  return rows[0] || null
}

// Idempotent upsert keyed on the ORIGINAL MongoDB `_id` — used only by the
// one-time Phase 3 data migration script
// (scripts/migrateMenuItemsToPostgres.js), never by the live request path.
export async function upsertMenuItemByLegacyMongoId(fields) {
  const { rows } = await pool.query(
    `INSERT INTO menu_items
       (name, category, description, price, image_url, cloudinary_public_id,
        default_stock, is_active, legacy_mongo_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL DO UPDATE SET
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       description = EXCLUDED.description,
       price = EXCLUDED.price,
       image_url = EXCLUDED.image_url,
       cloudinary_public_id = EXCLUDED.cloudinary_public_id,
       default_stock = EXCLUDED.default_stock,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *, (xmax = 0) AS inserted`,
    [
      fields.name,
      fields.category,
      fields.description,
      fields.price,
      fields.imageUrl,
      fields.cloudinaryPublicId,
      fields.defaultStock,
      fields.isActive,
      fields.legacyMongoId,
      fields.createdAt,
      fields.updatedAt,
    ],
  )
  return rows[0]
}
