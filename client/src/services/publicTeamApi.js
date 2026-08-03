// Phase 10 Part 2 — public team ecosystem client. Every number here comes
// straight from the server's read model; React never computes a win/loss
// record or a top performer itself.
import api from './api.js'

export async function fetchPublicTeams({ search, limit, offset } = {}) {
  const { data } = await api.get('/teams/discover', { params: { search, limit, offset } })
  return data
}

export async function fetchTeamProfile(teamId) {
  const { data } = await api.get(`/teams/${teamId}/profile`)
  return data
}
