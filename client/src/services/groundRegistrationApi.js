import api from './api.js'

// Phase 4 — Ground Owner registration is now request/approval
// (ground_owner_requests), not immediate self-serve. Submitting no longer
// creates a ground or grants ownership — a super_admin must approve first.
export async function submitGroundRegistration(payload) {
  const { data } = await api.post('/grounds', payload)
  return data.request
}

// Public reference-id status check — no login required, matches what
// RegisterGroundPage shows the applicant after submitting.
export async function fetchGroundRegistrationStatus(publicRequestId) {
  const { data } = await api.get(`/ground-owner-requests/status/${publicRequestId}`)
  return data.request
}

// Admin review queue (super_admin only).
export async function fetchPendingGroundRegistrations() {
  const { data } = await api.get('/ground-owner-requests')
  return data.requests
}

export async function approveGroundRegistration(publicRequestId) {
  const { data } = await api.post(`/ground-owner-requests/${publicRequestId}/approve`)
  return data
}

export async function rejectGroundRegistration(publicRequestId, reason) {
  const { data } = await api.post(`/ground-owner-requests/${publicRequestId}/reject`, { reason })
  return data.request
}

export async function requestGroundRegistrationInformation(publicRequestId, notes) {
  const { data } = await api.post(`/ground-owner-requests/${publicRequestId}/request-information`, { notes })
  return data.request
}
