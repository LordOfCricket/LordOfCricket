import api from './api'
import { Team } from '../types'

export async function discoverTeams(query?: string, limit = 20, offset = 0) {
  const response = await api.get('/teams/discover', {
    params: { q: query, limit, offset },
  })
  return response.data
}

export async function getAllTeams() {
  const response = await api.get('/teams')
  return response.data
}

export async function getTeamById(teamId: number): Promise<Team> {
  const response = await api.get<Team>(`/teams/${teamId}`)
  return response.data
}

export async function getTeamProfile(teamId: number) {
  const response = await api.get(`/teams/${teamId}/profile`)
  return response.data
}

export async function searchTeams(query: string, limit = 20, offset = 0) {
  return discoverTeams(query, limit, offset)
}

export async function getTeamMatches(teamId: number) {
  const response = await api.get(`/teams/${teamId}/matches`)
  return response.data
}

export async function getTeamPlayers(teamId: number) {
  const response = await api.get(`/teams/${teamId}/players`)
  return response.data
}
