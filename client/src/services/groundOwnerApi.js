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
// Umpire Communication & Commercial 2.0 — the response now also carries
// umpireFee (match-level) and each slot's earning/payment status.
export async function fetchGroundMatchUmpireSlots(publicGroundId, matchId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots`)
  return { slots: data.slots, umpireFee: data.umpireFee }
}

export async function setGroundMatchUmpireFee(publicGroundId, matchId, { amount, currency = 'INR' }) {
  const { data } = await api.patch(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-fee`, { amount, currency })
  return data.match
}

export async function updateGroundMatchSlotPaymentStatus(publicGroundId, matchId, slotId, status) {
  const { data } = await api.patch(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots/${slotId}/payment-status`, { status })
  return data.earning
}

// Umpire Intelligence & Scale 2.0 — deterministic, explainable candidate recommendations.
export async function fetchRecommendedUmpires(publicGroundId, matchId, { limit } = {}) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/recommended-umpires`, { params: { limit } })
  return data.candidates
}

export async function fetchUmpireOperationsSummary(publicGroundId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/umpire-operations-summary`)
  return data.summary
}

export async function startGroundMatch(publicGroundId, matchId, { confirmUnderstaffed = false } = {}) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/start`, { confirmUnderstaffed })
  return data.match
}

export async function completeGroundMatch(publicGroundId, matchId) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/complete`)
  return data.match
}

// Phase 23, Workstreams F/G/H — no-show, replacement, and the lightweight
// assignment history timeline.
export async function markUmpireNoShow(publicGroundId, matchId, slotId) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots/${slotId}/no-show`)
  return data.slot
}

export async function fetchEligibleReplacements(publicGroundId, matchId, slotId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots/${slotId}/eligible-replacements`)
  return data.candidates
}

export async function assignReplacementUmpire(publicGroundId, matchId, slotId, newUmpireUserId) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-slots/${slotId}/replace`, { newUmpireUserId })
  return data.slot
}

export async function fetchMatchAssignmentHistory(publicGroundId, matchId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/matches/${matchId}/umpire-history`)
  return data.events
}
