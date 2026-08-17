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

// Phase 4 — ground-scoped Staff (GROUND_ADMIN/CANTEEN_STAFF), distinct from
// the platform-wide admin-staff endpoints (adminStaffApi.js). Server-side
// authorization is the same requireGroundRole('GROUND_OWNER') every other
// function on this file already relies on.
export async function fetchGroundStaff(publicGroundId) {
  const { data } = await api.get(`/ground-owner/grounds/${publicGroundId}/staff`)
  return data.staff
}

export async function createGroundStaff(publicGroundId, { name, identifier, role }) {
  const { data } = await api.post(`/ground-owner/grounds/${publicGroundId}/staff`, { name, identifier, role })
  return data
}

// Phase 5 — granular Staff permissions. The catalog is ground-agnostic (the
// same 4 permissions exist for every ground); grant/revoke/disable are
// Owner-only server-side, same as createGroundStaff above.
export async function fetchPermissionCatalog() {
  const { data } = await api.get('/ground-owner/permissions/catalog')
  return data.permissions
}

export async function grantStaffPermission(publicGroundId, membershipId, permissionKey) {
  await api.post(`/ground-owner/grounds/${publicGroundId}/staff/${membershipId}/permissions`, { permissionKey })
}

export async function revokeStaffPermission(publicGroundId, membershipId, permissionKey) {
  await api.delete(`/ground-owner/grounds/${publicGroundId}/staff/${membershipId}/permissions/${permissionKey}`)
}

export async function disableGroundStaff(publicGroundId, membershipId) {
  await api.patch(`/ground-owner/grounds/${publicGroundId}/staff/${membershipId}/disable`)
}
