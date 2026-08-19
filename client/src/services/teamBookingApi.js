// Phase 24/25 — Team/player-aware ground bookings. Mirrors groundOwnerApi.js's
// ground-scoped shape (every function takes publicGroundId first). Thin wrappers,
// real backend as the source of truth.
import api from './api.js'

export async function createTeamBooking(publicGroundId, payload) {
  const { data } = await api.post(`/grounds/${publicGroundId}/bookings`, payload)
  return data.booking
}

export async function fetchTeamBookingDetail(publicGroundId, publicBookingId) {
  const { data } = await api.get(`/grounds/${publicGroundId}/bookings/${publicBookingId}`)
  return data.booking
}

export async function cancelTeamBooking(publicGroundId, publicBookingId) {
  const { data } = await api.post(`/grounds/${publicGroundId}/bookings/${publicBookingId}/cancel`)
  return data.booking
}

export async function checkInBooking(publicGroundId, publicBookingId) {
  const { data } = await api.post(`/grounds/${publicGroundId}/bookings/${publicBookingId}/check-in`)
  return data.booking
}

export async function recordNoShow(publicGroundId, publicBookingId) {
  const { data } = await api.post(`/grounds/${publicGroundId}/bookings/${publicBookingId}/no-show`)
  return data.booking
}

// Staff-only cancellation (no team membership required, ground staff authorization).
export async function staffCancelBooking(publicGroundId, publicBookingId, { reason } = {}) {
  const { data } = await api.post(`/grounds/${publicGroundId}/bookings/${publicBookingId}/staff-cancel`, { reason })
  return data.booking
}
