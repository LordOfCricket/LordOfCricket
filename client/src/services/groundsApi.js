import api from './api.js'

// Public reads (GET /api/grounds/nearby, GET /api/grounds/:publicGroundId,
// Phase 12) — thin wrappers over the shared axios instance, matching
// amenities.js/gallery.js/groundPhotos.js's existing convention. No auth
// header is required for these (the backend routes are public), but the
// shared `api` instance attaches one anyway when a session exists — harmless
// here since the endpoints don't branch on it.

export async function fetchNearbyGrounds({ latitude, longitude, radiusKm, page, limit }) {
  const { data } = await api.get('/grounds/nearby', {
    params: { lat: latitude, lng: longitude, radiusKm, page, limit },
  })
  return data
}

// Phase 13 (post-report revision) — city-based discovery, the primary
// frontend flow now. fetchNearbyGrounds above is kept working but unused.
export async function searchGroundsByCity({ city, page, limit }) {
  const { data } = await api.get('/grounds/search', { params: { city, page, limit } })
  return data
}

// "Grounds already registered on LOC" — the platform homepage's default
// browse list below the hero, no search required.
export async function fetchAllGrounds({ page, limit }) {
  const { data } = await api.get('/grounds', { params: { page, limit } })
  return data
}

export async function fetchGroundProfile(publicGroundId) {
  const { data } = await api.get(`/grounds/${publicGroundId}`)
  return data
}
