// U5 — Ground Owner's own grounds/matches. Mirrors umpireSelfApi.js's shape
// (thin wrappers, real backend as the source of truth).
import api from './api.js'

export async function fetchMyGrounds() {
  const { data } = await api.get('/ground-owner/grounds')
  return data.grounds
}

export async function fetchGroundMatches(publicGroundId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches`)
  return data.matches
}

export async function createGroundMatch(publicGroundId, payload) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches`, payload)
  return data.match
}

// Ground-owner-scoped umpire staffing detail — same shape as the generic
// GET /matches/:matchId/umpire-slots, but properly authorized to the
// owner of the match's own ground (requireGroundRole server-side).
export async function fetchGroundMatchUmpireSlots(publicGroundId, matchId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots`)
  return data.slots
}

export async function startGroundMatch(publicGroundId, matchId, { confirmUnderstaffed = false } = {}) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/start`, { confirmUnderstaffed })
  return data.match
}

export async function completeGroundMatch(publicGroundId, matchId) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/complete`)
  return data.match
}
