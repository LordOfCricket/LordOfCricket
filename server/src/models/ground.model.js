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

// Phase 23, Workstream B — the small, read-only slice Match Briefing needs
// (name + amenity names), by internal id. Deliberately a separate, narrow
// function rather than adding AMENITY_NAMES_SUBQUERY to findGroundById
// itself — that function's plain-row shape is relied on elsewhere (e.g.
// match.service.js's ground-exists validation), and widening it would
// change what every existing caller receives for no reason relevant to them.
export async function findGroundSummaryById(id) {
  const { rows } = await pool.query(`SELECT g.name, ${AMENITY_NAMES_SUBQUERY} FROM grounds g WHERE g.id = $1`, [id])
  return rows[0] || null
}

export async function findAllGrounds() {
  const { rows } = await pool.query('SELECT * FROM grounds ORDER BY id')
  return rows
}

// Phase 12 Step 22 — thrown instead of ever guessing which ground an admin
// write (ground_photos/amenities upload — Step 1's discovery that neither
// table has a ground_id yet) belongs to. Mirrors canteen.model.js's
// findSingleCanteen()/AmbiguousCanteenError exactly: zero grounds -> null
// ("not configured"), exactly one -> that row, more than one -> fail safely
// rather than silently picking "ground #1".
export class AmbiguousGroundError extends Error {
  constructor() {
    super('More than one ground exists — single-ground resolution is no longer safe.')
    this.name = 'AmbiguousGroundError'
  }
}

export async function findSingleGround() {
  const { rows } = await pool.query('SELECT * FROM grounds LIMIT 2')
  if (rows.length === 0) return null
  if (rows.length > 1) throw new AmbiguousGroundError()
  return rows[0]
}

// Phase 12 Step 24 — DRAFT/SUSPENDED grounds must not be reachable through
// the public profile endpoint at all; filtering status here (rather than
// fetching then checking in the controller) means an unknown id and a
// real-but-non-ACTIVE id produce the exact same "not found" result with no
// behavioral difference a client could use to distinguish the two cases.
// Explicit column list (Step 2) — never SELECT * for a public-facing query.
export async function findPublicActiveGroundByPublicId(publicGroundId) {
  const { rows } = await pool.query(
    `SELECT public_ground_id, slug, name, description, address_line, city, state,
            country, postal_code, latitude, longitude, phone, email, website, id
     FROM grounds
     WHERE public_ground_id = $1 AND status = 'ACTIVE'`,
    [publicGroundId],
  )
  return rows[0] || null
}

// Phase 12 Step 4-11 — the primary discovery query. PostGIS is unavailable
// (Step 6/38) so distance is computed with the numerically stable haversine
// form (asin/sqrt, not acos — acos's argument can drift fractionally above
// 1 from floating-point error at very small distances and throw a domain
// error) directly over the existing NUMERIC latitude/longitude columns.
// A CTE is required (Step 7) because PostgreSQL cannot reference a SELECT
// alias in the same level's WHERE clause. `COUNT(*) OVER()` for the
// pagination total matches the established pattern in
// tournament.repository.js's listPublicTournaments query — one round trip,
// not two. `primary_photo` is a per-row correlated subquery (Step 12 needs
// a ground-card thumbnail); acceptable at radius-filtered result-set sizes,
// mirroring tournament.repository.js's own per-row subquery for team_count.
const EARTH_RADIUS_KM = 6371 // mean radius, standard haversine constant

// Homepage redesign (Stage 1) — a correlated `array_agg` for each ground's
// real amenity names, same cost/scale reasoning as the existing
// primary_photo subquery right above each use (one extra correlated
// subquery per row; fine at current row counts, see this file's EXPLAIN
// findings). This is what lets GroundCard show real facility chips and the
// Facilities filter build itself from real data instead of a hardcoded
// list. NULL when a ground has zero amenities (array_agg over no rows);
// controllers coalesce that to [] before it reaches the client.
const AMENITY_NAMES_SUBQUERY = `(SELECT array_agg(a.name) FROM amenities a WHERE a.ground_id = g.id) AS amenity_names`

export async function findNearbyActiveGrounds({ latitude, longitude, radiusKm, limit, offset }) {
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         public_ground_id, slug, name, city, state, country, latitude, longitude,
         (SELECT gp.image_url FROM ground_photos gp
          WHERE gp.ground_id = g.id
          ORDER BY gp.sort_order, gp.created_at
          LIMIT 1) AS primary_photo,
         ${AMENITY_NAMES_SUBQUERY},
         ${2 * EARTH_RADIUS_KM} * asin(
           sqrt(
             power(sin(radians(latitude - $1) / 2), 2)
             + cos(radians($1)) * cos(radians(latitude))
               * power(sin(radians(longitude - $2) / 2), 2)
           )
         ) AS distance_km
       FROM grounds g
       WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     WHERE distance_km <= $3
     ORDER BY distance_km ASC
     LIMIT $4 OFFSET $5`,
    [latitude, longitude, radiusKm, limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

// Phase 13 (post-report revision) — city-based discovery replaces
// distance-based discovery as the primary frontend flow (product decision:
// most grounds don't have real latitude/longitude set yet — see the Phase
// 13 report's "remaining risks" — so searching by the `city` text column
// grounds already have is the more honest, dependency-free match: no
// geocoding service, no coordinates required at all). findNearbyActiveGrounds
// above is left fully intact, just no longer called by the frontend.
//
// `city ILIKE '%' || $1 || '%'` is a partial, case-insensitive match (typing
// "delhi" should find "New Delhi") — the wildcard is built into the bound
// parameter value in JS, never string-concatenated into the SQL text, so
// this stays fully parameterized (Step 28). A leading wildcard means a
// plain B-tree index on `city` couldn't be used for a range scan anyway;
// at current row counts Postgres correctly prefers a Seq Scan regardless
// (same reasoning as the rest of this file's EXPLAIN findings) — a trigram
// (pg_trgm) index is the documented future option if/when this needs to
// scale, not added now (no new extension this phase).
export async function findActiveGroundsByCity({ city, limit, offset }) {
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         public_ground_id, slug, name, city, state, country,
         (SELECT gp.image_url FROM ground_photos gp
          WHERE gp.ground_id = g.id
          ORDER BY gp.sort_order, gp.created_at
          LIMIT 1) AS primary_photo,
         ${AMENITY_NAMES_SUBQUERY}
       FROM grounds g
       WHERE status = 'ACTIVE' AND city ILIKE '%' || $1 || '%'
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    [city, limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

// Umpire ground-wise discovery — same eligibility/shape as the two
// public discovery queries above, but scoped to grounds that currently
// have at least one 'upcoming' match (a ground with no upcoming matches
// has nothing for an umpire to see, so it's excluded at the SQL level
// rather than returned and then hidden client-side), plus the FULL photo
// gallery (not just one primary_photo — the umpire card needs a
// carousel) and the internal `g.id` (needed to batch-fetch matches for
// these grounds in a second query; never sent to the wire, only
// public_ground_id is).
const GROUND_PHOTOS_SUBQUERY = `
  (SELECT COALESCE(json_agg(json_build_object('imageUrl', gp.image_url, 'title', gp.title) ORDER BY gp.sort_order, gp.created_at), '[]')
   FROM ground_photos gp WHERE gp.ground_id = g.id) AS photos
`

const UPCOMING_MATCH_EXISTS = `EXISTS (SELECT 1 FROM matches m WHERE m.ground_id = g.id AND m.status = 'upcoming')`

export async function findNearbyGroundsWithUpcomingMatches({ latitude, longitude, radiusKm, limit, offset }) {
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         g.id, public_ground_id, slug, name, city, state, country, latitude, longitude,
         ${GROUND_PHOTOS_SUBQUERY},
         ${AMENITY_NAMES_SUBQUERY},
         ${2 * EARTH_RADIUS_KM} * asin(
           sqrt(
             power(sin(radians(latitude - $1) / 2), 2)
             + cos(radians($1)) * cos(radians(latitude))
               * power(sin(radians(longitude - $2) / 2), 2)
           )
         ) AS distance_km
       FROM grounds g
       WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND ${UPCOMING_MATCH_EXISTS}
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     WHERE distance_km <= $3
     ORDER BY distance_km ASC
     LIMIT $4 OFFSET $5`,
    [latitude, longitude, radiusKm, limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

export async function findGroundsByCityWithUpcomingMatches({ city, limit, offset }) {
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         g.id, public_ground_id, slug, name, city, state, country,
         ${GROUND_PHOTOS_SUBQUERY},
         ${AMENITY_NAMES_SUBQUERY}
       FROM grounds g
       WHERE status = 'ACTIVE' AND city ILIKE '%' || $1 || '%'
         AND ${UPCOMING_MATCH_EXISTS}
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    [city, limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

// Cheap existence-only probes (no matches filter) — fired only when the
// two queries above return zero grounds, to tell "no grounds at all
// nearby/in this city" apart from "grounds exist but none have upcoming
// matches" without paying the matches-EXISTS cost on every request.
export async function anyActiveGroundNearby({ latitude, longitude, radiusKm }) {
  const { rows } = await pool.query(
    `SELECT 1 FROM grounds g
     WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL
       AND ${2 * EARTH_RADIUS_KM} * asin(
         sqrt(
           power(sin(radians(latitude - $1) / 2), 2)
           + cos(radians($1)) * cos(radians(latitude))
             * power(sin(radians(longitude - $2) / 2), 2)
         )
       ) <= $3
     LIMIT 1`,
    [latitude, longitude, radiusKm],
  )
  return rows.length > 0
}

export async function anyActiveGroundInCity({ city }) {
  const { rows } = await pool.query(`SELECT 1 FROM grounds WHERE status = 'ACTIVE' AND city ILIKE '%' || $1 || '%' LIMIT 1`, [city])
  return rows.length > 0
}

// "Grounds for Umpire" default view — every ground with an upcoming match,
// unfiltered by city/distance, so navigating to the page shows real
// opportunities immediately rather than requiring a search first. Same
// shape/ACTIVE-only + UPCOMING_MATCH_EXISTS filter as
// findGroundsByCityWithUpcomingMatches, just without the WHERE city clause
// — mirrors how findAllActiveGrounds already relates to findActiveGroundsByCity.
export async function findAllGroundsWithUpcomingMatches({ limit, offset }) {
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         g.id, public_ground_id, slug, name, city, state, country,
         ${GROUND_PHOTOS_SUBQUERY},
         ${AMENITY_NAMES_SUBQUERY}
       FROM grounds g
       WHERE status = 'ACTIVE'
         AND ${UPCOMING_MATCH_EXISTS}
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     ORDER BY name ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

export async function anyActiveGroundExists() {
  const { rows } = await pool.query(`SELECT 1 FROM grounds WHERE status = 'ACTIVE' LIMIT 1`)
  return rows.length > 0
}

// Unscoped browse — "grounds already registered on LOC," shown on the
// platform homepage below the hero without requiring a city search first.
// Same public card shape/ACTIVE-only filter as findActiveGroundsByCity,
// just without the WHERE city clause. NOT the same function as
// findAllGrounds() above (Phase 8) — that one is SELECT * with no status
// filter, used internally by admin-facing code; this is the explicit,
// public-safe, paginated equivalent for the discovery API.
// `sort` is a fixed, internal enum (never interpolated from client input
// directly into SQL) — 'name' (default, alphabetical browse), 'newest'
// (FeaturedGrounds.jsx's "most recently added" selection — real data, not
// a fabricated "featured" flag the schema doesn't have), or 'city' (the
// Grounds page's primary sort — "first sort by city").
const ALL_GROUNDS_SORTS = {
  name: 'name ASC',
  newest: 'created_at DESC',
  city: 'city ASC, name ASC',
}

export async function findAllActiveGrounds({ limit, offset, sort = 'name' }) {
  const orderBy = ALL_GROUNDS_SORTS[sort] || ALL_GROUNDS_SORTS.name
  const { rows } = await pool.query(
    `WITH candidate_grounds AS (
       SELECT
         public_ground_id, slug, name, city, state, country, created_at,
         (SELECT gp.image_url FROM ground_photos gp
          WHERE gp.ground_id = g.id
          ORDER BY gp.sort_order, gp.created_at
          LIMIT 1) AS primary_photo,
         ${AMENITY_NAMES_SUBQUERY}
       FROM grounds g
       WHERE status = 'ACTIVE'
     )
     SELECT *, COUNT(*) OVER()::int AS total_count
     FROM candidate_grounds
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  return { rows, total: rows[0]?.total_count ?? 0 }
}

// Self-serve ground registration (POST /grounds) — submitted grounds start
// as DRAFT and need a super_admin to review them before they're publicly
// discoverable. findGroundsByStatus powers the admin "pending" queue;
// decideGroundStatus is deliberately scoped to DRAFT -> {ACTIVE,SUSPENDED}
// only (the `AND status = 'DRAFT'` guard) — this is specifically "decide a
// pending submission," not a general status-editing endpoint, which wasn't
// asked for and doesn't exist as a feature.
export async function findGroundsByStatus(status) {
  const { rows } = await pool.query('SELECT * FROM grounds WHERE status = $1 ORDER BY created_at DESC', [status])
  return rows
}

export async function decideGroundStatus(publicGroundId, nextStatus) {
  const { rows } = await pool.query(
    `UPDATE grounds SET status = $2, updated_at = NOW() WHERE public_ground_id = $1 AND status = 'DRAFT' RETURNING *`,
    [publicGroundId, nextStatus],
  )
  return rows[0] || null
}

// Homepage redesign (Stage 1) — real, distinct city names that currently
// have at least one ACTIVE ground, for the searchable CitySelector. Never
// a hardcoded "possible cities" list — this is what actually exists.
export async function findDistinctActiveCities() {
  const { rows } = await pool.query(
    `SELECT DISTINCT city FROM grounds WHERE status = 'ACTIVE' AND city IS NOT NULL ORDER BY city`,
  )
  return rows.map((r) => r.city)
}
