// Phase 7 — official career statistics client. Every number here is derived
// server-side from finalized PostgreSQL match history on every request; there
// is no client-side aggregation and nothing is cached in localStorage.
import api from './api.js'

export async function fetchMyStats({ limit, offset } = {}) {
  const { data } = await api.get('/me/stats', { params: { limit, offset } })
  return data
}

export async function fetchPlayerStats(publicPlayerId, { limit, offset } = {}) {
  const { data } = await api.get(`/players/${publicPlayerId}/stats`, { params: { limit, offset } })
  return data
}

// Phase 8 — player discovery, public profiles, leaderboards. All public
// (no auth required), consistent with the public-read posture of /matches.

export async function fetchPublicPlayerInfo(publicPlayerId) {
  const { data } = await api.get(`/players/${publicPlayerId}`)
  return data.player
}

export async function searchPlayers({ q, role, teamId, limit, offset } = {}) {
  const { data } = await api.get('/players', { params: { q, role, teamId, limit, offset } })
  return data
}

export async function fetchLeaderboard(metric, { role, teamId, limit, offset } = {}) {
  const { data } = await api.get(`/stats/leaderboards/${metric}`, { params: { role, teamId, limit, offset } })
  return data
}
