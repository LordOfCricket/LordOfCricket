import {
  findNearbyActiveGrounds,
  findActiveGroundsByCity,
  findAllActiveGrounds,
  findDistinctActiveCities,
  findPublicActiveGroundByPublicId,
  findGroundBySlug,
  createGround,
} from '../models/ground.model.js'
import { findGroundPhotosByGroundId } from '../models/groundPhoto.model.js'
import { findAmenitiesByGroundId } from '../models/amenity.model.js'
import { findCanteensByGroundId } from '../models/canteen.model.js'
import { createMembership } from '../models/groundUser.model.js'
import { generatePublicId } from '../utils/publicId.js'
import { slugify } from '../utils/slug.js'

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
export function parseCoordinate(raw, min, max) {
  if (raw === undefined || raw === '') return { error: true }
  const value = Number(raw)
  if (!isFiniteNumber(value) || value < min || value > max) return { error: true }
  return { value }
}

export function parseRadiusKm(raw) {
  if (raw === undefined || raw === '') return { value: DEFAULT_RADIUS_KM }
  const value = Number(raw)
  if (!isFiniteNumber(value) || value <= 0) return { error: true }
  return { value: Math.min(value, MAX_RADIUS_KM) }
}

export function parsePagination(query) {
  const rawLimit = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit)
  const rawPage = query.page === undefined ? 1 : Number(query.page)
  const limit = Math.max(1, Math.min(isFiniteNumber(rawLimit) ? Math.trunc(rawLimit) : DEFAULT_LIMIT, MAX_LIMIT))
  const page = Math.max(1, isFiniteNumber(rawPage) ? Math.trunc(rawPage) : 1)
  return { limit, page, offset: (page - 1) * limit }
}

// Step 8 — round only at the presentation boundary; filtering (in the SQL
// query itself) already used the full-precision value.
export function roundDistance(km) {
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
    // Homepage redesign (Stage 1) — real per-ground amenity names, powers
    // GroundCard's facility chips and GroundFiltersBar's Facilities filter.
    // array_agg over zero rows is SQL NULL, never [] — coalesce here so the
    // client only ever sees a real array.
    amenities: row.amenity_names || [],
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

const ALLOWED_ALL_GROUNDS_SORTS = ['name', 'newest', 'city']

// "Grounds already registered on LOC" — the platform homepage's default
// browse list, shown below the hero without requiring a city search first.
// No filter at all beyond ACTIVE status. `sort=newest` is what
// FeaturedGrounds.jsx uses (real created_at ordering, not a fabricated
// "featured" flag the schema doesn't have) — `sort` is validated against a
// fixed allow-list, never passed through to SQL as-is.
export async function listAllGrounds(req, res, next) {
  try {
    const { limit, page, offset } = parsePagination(req.query)
    const sort = ALLOWED_ALL_GROUNDS_SORTS.includes(req.query.sort) ? req.query.sort : 'name'
    const { rows, total } = await findAllActiveGrounds({ limit, offset, sort })

    res.json({
      grounds: rows.map(serializeGroundCard),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err)
  }
}

// Real, distinct city names with at least one ACTIVE ground — powers the
// searchable CitySelector. Never a hardcoded list.
export async function listGroundCities(req, res, next) {
  try {
    const cities = await findDistinctActiveCities()
    res.json({ cities })
  } catch (err) {
    next(err)
  }
}

// Self-serve ground registration — "want to register your ground on LOC."
// Any logged-in user (requireAuth, not staff-only) may submit one; the
// ground is created as DRAFT (schema default/intent — see schema.sql's own
// comment on the grounds table) and stays invisible to every public
// discovery endpoint (all of which filter status = 'ACTIVE') until a
// super_admin reviews it via GET/PATCH /ground-review. The submitting user
// is recorded as that ground's GROUND_OWNER via a ground_users membership
// row, the same authorization primitive Phase 9 already built for this
// exact purpose.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_LIMITS = { name: 150, description: 500, addressLine: 255, city: 100, state: 100, country: 100, postalCode: 20, phone: 30, email: 150, website: 300 }

function requiredText(value, maxLength) {
  if (typeof value !== 'string') return { error: true }
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return { error: true }
  return { value: trimmed }
}

function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: true }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) return { error: true }
  return { value: trimmed || null }
}

async function ensureUniqueSlug(name) {
  const base = slugify(name) || 'ground'
  if (!(await findGroundBySlug(base))) return base
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
    if (!(await findGroundBySlug(candidate))) return candidate
  }
  throw new Error('Could not generate a unique ground slug.')
}

export async function registerGround(req, res, next) {
  try {
    const body = req.body || {}

    const name = requiredText(body.name, FIELD_LIMITS.name)
    if (name.error) return res.status(400).json({ error: `Ground name is required (max ${FIELD_LIMITS.name} characters).` })
    const addressLine = requiredText(body.addressLine, FIELD_LIMITS.addressLine)
    if (addressLine.error) return res.status(400).json({ error: 'Address is required.' })
    const city = requiredText(body.city, FIELD_LIMITS.city)
    if (city.error) return res.status(400).json({ error: 'City is required.' })
    const state = requiredText(body.state, FIELD_LIMITS.state)
    if (state.error) return res.status(400).json({ error: 'State is required.' })
    const phone = requiredText(body.phone, FIELD_LIMITS.phone)
    if (phone.error) return res.status(400).json({ error: 'A contact phone number is required.' })

    const description = optionalText(body.description, FIELD_LIMITS.description)
    if (description.error) return res.status(400).json({ error: `Description must be ${FIELD_LIMITS.description} characters or fewer.` })
    const postalCode = optionalText(body.postalCode, FIELD_LIMITS.postalCode)
    if (postalCode.error) return res.status(400).json({ error: 'Postal code is too long.' })
    const country = optionalText(body.country, FIELD_LIMITS.country)
    if (country.error) return res.status(400).json({ error: 'Country is too long.' })
    const website = optionalText(body.website, FIELD_LIMITS.website)
    if (website.error) return res.status(400).json({ error: 'Website URL is too long.' })

    const email = optionalText(body.email, FIELD_LIMITS.email)
    if (email.error || (email.value && !EMAIL_PATTERN.test(email.value))) return res.status(400).json({ error: 'Email must be a valid address.' })

    const lat = parseCoordinate(body.latitude, -90, 90)
    const lng = parseCoordinate(body.longitude, -180, 180)
    // Coordinates are optional, but if given at all, both must be valid —
    // a lone lat or lone lng can't locate anything.
    if (body.latitude !== undefined && body.latitude !== '' && lat.error) return res.status(400).json({ error: 'Latitude must be a number between -90 and 90.' })
    if (body.longitude !== undefined && body.longitude !== '' && lng.error) return res.status(400).json({ error: 'Longitude must be a number between -180 and 180.' })
    const hasCoords = !lat.error && !lng.error

    const slug = await ensureUniqueSlug(name.value)

    const ground = await createGround({
      publicGroundId: generatePublicId('GRD', 8),
      slug,
      name: name.value,
      description: description.value,
      addressLine: addressLine.value,
      city: city.value,
      state: state.value,
      country: country.value || 'India',
      postalCode: postalCode.value,
      latitude: hasCoords ? lat.value : null,
      longitude: hasCoords ? lng.value : null,
      phone: phone.value,
      email: email.value,
      website: website.value,
      status: 'DRAFT',
    })

    await createMembership({ groundId: ground.id, userId: req.user.id, role: 'GROUND_OWNER', isActive: true })

    res.status(201).json({
      ground: { publicGroundId: ground.public_ground_id, slug: ground.slug, name: ground.name, status: ground.status },
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
