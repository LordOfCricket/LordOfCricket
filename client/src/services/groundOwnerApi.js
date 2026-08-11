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
