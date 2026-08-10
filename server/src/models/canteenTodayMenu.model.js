import { pool } from '../config/db.js'

// MongoDB cleanup, Phase 4 — TodayMenu's storage layer, migrated from
// Mongoose to plain parameterized SQL (today_menu + today_menu_items).
// Order stays on MongoDB this phase — this file has zero knowledge of it.
// The retired Mongoose model (canteenTodayMenuMongoLegacy.model.js) is kept
// only for the one-time data migration script and rollback reference.

// "The" one TodayMenu row — the retired code's own convention
// (`TodayMenu.findOne({})` with no filter). Always the lowest id; the live
// write path below never creates a second row once one exists.
export async function getTodayMenu() {
  const { rows: menuRows } = await pool.query('SELECT * FROM today_menu ORDER BY id LIMIT 1')
  const menu = menuRows[0]
  if (!menu) return null

  const { rows: items } = await pool.query(
    'SELECT * FROM today_menu_items WHERE today_menu_id = $1 ORDER BY sort_order',
    [menu.id],
  )
  return { ...menu, items }
}

// Transactional replace-all (Step 12/16) — the live write path behind
// `PATCH /canteen/menu/today`. Resolves each incoming item against the
// real `menu_items` table (a real FK — see schema.sql's comment: an id
// that doesn't resolve is simply never inserted, matching the retired
// code's own read-side invisibility for such ids exactly), dedups by id
// keeping the LAST occurrence at its ORIGINAL array position (matches the
// retired code's own read-side `Object.fromEntries` "last wins" behavior),
// then deletes and reinserts every child row inside one transaction — if
// anything fails, the previous state is left completely untouched.
export async function replaceTodayMenu({ publishedAt, items }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: existing } = await client.query('SELECT id FROM today_menu ORDER BY id LIMIT 1')
    let todayMenuId
    if (existing[0]) {
      todayMenuId = existing[0].id
      await client.query('UPDATE today_menu SET published_at = $1, updated_at = NOW() WHERE id = $2', [publishedAt, todayMenuId])
    } else {
      const inserted = await client.query('INSERT INTO today_menu (published_at) VALUES ($1) RETURNING id', [publishedAt])
      todayMenuId = inserted.rows[0].id
    }

    await client.query('DELETE FROM today_menu_items WHERE today_menu_id = $1', [todayMenuId])

    const byId = new Map()
    items.forEach((item, index) => {
      if (item && item.id != null) byId.set(String(item.id), { item, sortOrder: index })
    })

    let insertedCount = 0
    for (const [rawId, { item, sortOrder }] of byId) {
      const numericId = Number(rawId)
      if (!Number.isInteger(numericId)) continue
      const { rows: menuItemRows } = await client.query('SELECT id FROM menu_items WHERE id = $1', [numericId])
      if (!menuItemRows[0]) continue

      await client.query(
        `INSERT INTO today_menu_items (today_menu_id, menu_item_id, available, stock, daily_price, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          todayMenuId,
          numericId,
          Boolean(item.available),
          typeof item.stock === 'number' ? item.stock : 0,
          typeof item.dailyPrice === 'number' ? item.dailyPrice : 0,
          sortOrder,
        ],
      )
      insertedCount++
    }

    await client.query('COMMIT')
    return { todayMenuId, insertedCount }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Backs deleteMenuItem's existing cross-table cleanup (Phase 1-3's own
// established behavior: deactivating a MenuItem removes it from today's
// published menu) — now a real indexed DELETE instead of an in-memory
// array filter + full-document `.save()`.
export async function deleteTodayMenuItemsByMenuItemId(menuItemId) {
  await pool.query('DELETE FROM today_menu_items WHERE menu_item_id = $1', [menuItemId])
}

// Idempotent, transactional upsert keyed on the ORIGINAL MongoDB `_id` —
// used only by the one-time Phase 4 data migration script
// (scripts/migrateTodayMenuToPostgres.js), never by the live request path.
// `resolvedItems` is pre-validated by the caller (Step 11 — the migration
// itself fails all-or-nothing on an unresolvable id, BEFORE this function
// is ever called, unlike the live write path's permissive skip-and-continue).
export async function upsertTodayMenuByLegacyMongoId({ legacyMongoId, publishedAt, createdAt, updatedAt, resolvedItems }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: existing } = await client.query('SELECT id FROM today_menu WHERE legacy_mongo_id = $1', [legacyMongoId])
    let todayMenuId
    let inserted
    if (existing[0]) {
      todayMenuId = existing[0].id
      inserted = false
      await client.query('UPDATE today_menu SET published_at = $1, updated_at = NOW() WHERE id = $2', [publishedAt, todayMenuId])
    } else {
      inserted = true
      const row = await client.query(
        'INSERT INTO today_menu (published_at, created_at, updated_at, legacy_mongo_id) VALUES ($1,$2,$3,$4) RETURNING id',
        [publishedAt, createdAt, updatedAt, legacyMongoId],
      )
      todayMenuId = row.rows[0].id
    }

    await client.query('DELETE FROM today_menu_items WHERE today_menu_id = $1', [todayMenuId])

    for (const { menuItemId, available, stock, dailyPrice, sortOrder } of resolvedItems) {
      await client.query(
        `INSERT INTO today_menu_items (today_menu_id, menu_item_id, available, stock, daily_price, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [todayMenuId, menuItemId, available, stock, dailyPrice, sortOrder],
      )
    }

    await client.query('COMMIT')
    return { todayMenuId, inserted, itemCount: resolvedItems.length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Resolves one TodayMenu item id against menu_items, trying BOTH forms:
// already-Postgres-format (the current live state, post-Phase-3A) and the
// general historical case (a still-old Mongo ObjectId string, resolvable
// only via legacy_mongo_id). Returns the real menu_items.id, or null if
// neither resolves — the migration script treats null as a hard failure
// (Step 4/11: stop, never invent a replacement MenuItem).
export async function resolveMenuItemId(rawId) {
  const direct = Number(rawId)
  if (Number.isInteger(direct)) {
    const { rows } = await pool.query('SELECT id FROM menu_items WHERE id = $1', [direct])
    if (rows[0]) return rows[0].id
  }
  const { rows: byLegacy } = await pool.query('SELECT id FROM menu_items WHERE legacy_mongo_id = $1', [String(rawId)])
  if (byLegacy[0]) return byLegacy[0].id
  return null
}
