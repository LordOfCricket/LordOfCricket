import { findNearbyActiveGrounds, findActiveGroundsByCity, findAllActiveGrounds, findPublicActiveGroundByPublicId } from '../models/ground.model.js'
import { findGroundPhotosByGroundId } from '../models/groundPhoto.model.js'
import { findAmenitiesByGroundId } from '../models/amenity.model.js'
import { findCanteensByGroundId } from '../models/canteen.model.js'

// Phase 12 Step 9/11 — documented defaults/limits. DEFAULT_RADIUS_KM is the
// "within 10 km" example the brief itself uses for the expected UX.
// MAX_RADIUS_KM (100) covers even the largest Indian metro areas (Step 5
// requires SOME cap — an unrestricted radius is a full-table distance
// computation with no benefit over just listing all grounds).
// DEFAULT_LIMIT/MAX_LIMIT mirror tournament.service.js's existing
// pagination convention (limit=20 default, clamped to 50) rather than
// inventing a second one.
const DEFAULT_RADIUS_KM = 10
const MAX_RADIUS_KM = 100
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

// Step 5 — reject missing/NaN/Infinity/non-numeric/out-of-range values.
// Query params always arrive as strings; Number('') is 0 (a false pass) and
// Number('abc') is NaN, so both must be checked explicitly.
function parseCoordinate(raw, min, max) {
  if (raw === undefined || raw === '') return { error: true }
  const value = Number(raw)
  if (!isFiniteNumber(value) || value < min || value > max) return { error: true }
  return { value }
}

function parseRadiusKm(raw) {
  if (raw === undefined || raw === '') return { value: DEFAULT_RADIUS_KM }
  const value = Number(raw)
  if (!isFiniteNumber(value) || value <= 0) return { error: true }
  return { value: Math.min(value, MAX_RADIUS_KM) }
}

function parsePagination(query) {
  const rawLimit = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit)
  const rawPage = query.page === undefined ? 1 : Number(query.page)
  const limit = Math.max(1, Math.min(isFiniteNumber(rawLimit) ? Math.trunc(rawLimit) : DEFAULT_LIMIT, MAX_LIMIT))
  const page = Math.max(1, isFiniteNumber(rawPage) ? Math.trunc(rawPage) : 1)
  return { limit, page, offset: (page - 1) * limit }
}

// Step 8 — round only at the presentation boundary; filtering (in the SQL
// query itself) already used the full-precision value.
function roundDistance(km) {
  return Math.round(Number(km) * 100) / 100
}

// Shared row -> public card mapping for all three discovery flows (nearby/
// city/all) — one place defines "what a ground card looks like on the
// wire" instead of three near-identical object literals drifting apart.
function serializeGroundCard(row) {
  return {
    publicGroundId: row.public_ground_id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    state: row.state,
    country: row.country,
    primaryPhoto: row.primary_photo,
  }
}

export async function listNearbyGrounds(req, res, next) {
  try {
    const lat = parseCoordinate(req.query.lat, -90, 90)
    if (lat.error) return res.status(400).json({ error: 'lat must be a number between -90 and 90.' })
    const lng = parseCoordinate(req.query.lng, -180, 180)
    if (lng.error) return res.status(400).json({ error: 'lng must be a number between -180 and 180.' })
    const radius = parseRadiusKm(req.query.radiusKm)
    if (radius.error) return res.status(400).json({ error: `radiusKm must be a positive number (maximum ${MAX_RADIUS_KM}).` })

    const { limit, page, offset } = parsePagination(req.query)

    const { rows, total } = await findNearbyActiveGrounds({
      latitude: lat.value,
      longitude: lng.value,
      radiusKm: radius.value,
      limit,
      offset,
    })

    res.json({
      grounds: rows.map((row) => ({ ...serializeGroundCard(row), distanceKm: roundDistance(row.distance_km) })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err)
  }
}

const MAX_CITY_LENGTH = 100

// Phase 13 (post-report revision) — city replaces lat/lng as the primary
// discovery input (product decision — most grounds don't have real
// coordinates yet). No distanceKm in the response: city matching involves
// no coordinates at all, so there's nothing honest to compute a distance
// from. listNearbyGrounds above is untouched and still reachable, just no
// longer the frontend's primary path.
export async function listGroundsByCity(req, res, next) {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : ''
    if (!city) return res.status(400).json({ error: 'city is required.' })
    if (city.length > MAX_CITY_LENGTH) return res.status(400).json({ error: `city must be ${MAX_CITY_LENGTH} characters or fewer.` })

    const { limit, page, offset } = parsePagination(req.query)
    const { rows, total } = await findActiveGroundsByCity({ city, limit, offset })

    res.json({
      grounds: rows.map(serializeGroundCard),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err)
  }
}

// "Grounds already registered on LOC" — the platform homepage's default
// browse list, shown below the hero without requiring a city search first.
// No filter at all beyond ACTIVE status.
export async function listAllGrounds(req, res, next) {
  try {
    const { limit, page, offset } = parsePagination(req.query)
    const { rows, total } = await findAllActiveGrounds({ limit, offset })

    res.json({
      grounds: rows.map(serializeGroundCard),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err)
  }
}

export async function getGroundProfile(req, res, next) {
  try {
    const ground = await findPublicActiveGroundByPublicId(req.params.publicGroundId)
    // Step 24 — DRAFT/SUSPENDED and "doesn't exist at all" return the exact
    // same 404: the query already filtered on status = 'ACTIVE', so this
    // branch can't distinguish the two cases even if it wanted to.
    if (!ground) {
      return res.status(404).json({ error: 'Ground not found.' })
    }

    const [photos, amenities, canteens] = await Promise.all([
      findGroundPhotosByGroundId(ground.id),
      findAmenitiesByGroundId(ground.id),
      findCanteensByGroundId(ground.id),
    ])

    res.json({
      ground: {
        publicGroundId: ground.public_ground_id,
        slug: ground.slug,
        name: ground.name,
        description: ground.description,
        addressLine: ground.address_line,
        city: ground.city,
        state: ground.state,
        country: ground.country,
        postalCode: ground.postal_code,
        latitude: ground.latitude,
        longitude: ground.longitude,
        phone: ground.phone,
        email: ground.email,
        website: ground.website,
      },
      photos: photos.map((p) => ({ title: p.title, imageUrl: p.image_url, sortOrder: p.sort_order })),
      amenities: amenities.map((a) => ({ name: a.name, imageUrl: a.image_url, sortOrder: a.sort_order })),
      // Step 17 — gallery_images has no ground relationship yet (Step 1's
      // discovery) and the brief explicitly forbids redesigning it this
      // phase. Returning null (not the global gallery) is the only choice
      // that can't leak another future ground's images once one exists.
      gallery: null,
      // Step 18 — an array, not a single object: canteens.ground_id has no
      // UNIQUE constraint (a ground may have more than one canteen per the
      // Phase 8 schema comment), so collapsing to one would silently hide
      // real canteens. Only the fields Step 18 allows — never staff/orders/
      // menu/internal id.
      canteens: canteens.map((c) => ({ publicCanteenId: c.public_canteen_id, name: c.name, isActive: c.is_active })),
    })
  } catch (err) {
    next(err)
  }
}
