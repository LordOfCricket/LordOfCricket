import api from './api.js'

// Self-serve ground registration — "want to register your ground on LOC."
export async function submitGroundRegistration(payload) {
  const { data } = await api.post('/grounds', payload)
  return data.ground
}

// Admin review queue (super_admin only) for submissions above.
export async function fetchPendingGroundRegistrations() {
  const { data } = await api.get('/ground-review')
  return data.grounds
}

export async function decideGroundRegistration(publicGroundId, status) {
  const { data } = await api.patch(`/ground-review/${publicGroundId}`, { status })
  return data.ground
}
