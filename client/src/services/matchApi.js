// Client for the Phase 5 real-match lifecycle API (create/roster/toss/start).
// Live scoring itself still goes through scoringApi.js — this file is only
// match setup, kept separate from that file's documented Phase 3/4 scope.
import api from './api.js'

export async function listMatches() {
  const { data } = await api.get('/matches')
  return data
}

export async function createMatch(payload) {
  const { data } = await api.post('/matches', payload)
  return data.match
}

export async function fetchMatch(matchId) {
  const { data } = await api.get(`/matches/${matchId}`)
  return data.match
}

export async function setToss(matchId, payload) {
  const { data } = await api.patch(`/matches/${matchId}/toss`, payload)
  return data.match
}

export async function startMatch(matchId) {
  const { data } = await api.post(`/matches/${matchId}/start`)
  return data.match
}

export async function finalizeMatch(matchId) {
  const { data } = await api.post(`/matches/${matchId}/finalize`)
  return data.match
}

export async function fetchMatchInnings(matchId) {
  const { data } = await api.get(`/matches/${matchId}/innings`)
  return data.innings
}
