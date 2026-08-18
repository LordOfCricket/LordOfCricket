import { pool } from '../config/db.js'

// LOC-controlled catalog a Ground Owner selects from at registration —
// never the owner-uploaded-photo `amenities` table (amenity.model.js),
// which is a separate, untouched legacy mechanism for already-approved
// grounds. See schema.sql's amenity_catalog comment for the full framing.

export async function findAllActive() {
  const { rows } = await pool.query('SELECT key, name, icon FROM amenity_catalog WHERE is_active = true ORDER BY display_order')
  return rows
}

// Server-side membership check for a client-supplied list of keys —
// never trust that a submitted amenityKeys array only contains real,
// active catalog keys.
export async function findActiveKeys(keys, client = pool) {
  if (!keys || keys.length === 0) return []
  const { rows } = await client.query('SELECT key FROM amenity_catalog WHERE key = ANY($1::varchar[]) AND is_active = true', [keys])
  return rows.map((r) => r.key)
}
