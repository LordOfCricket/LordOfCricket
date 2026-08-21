import api from './api'
import { Match, MatchSummary, MatchLiveState, MatchDiscoverResponse } from '../types'

export async function discoverMatches(category: 'LIVE' | 'UPCOMING' | 'RESULTS', limit = 20, offset = 0) {
  const response = await api.get('/matches/discover', {
    params: { category, limit, offset },
  })
  return response.data
}

export async function getHomeFeed() {
  // TEMPORARY DEBUG: Log exact request details
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
  const endpoint = '/matches/home'
  const fullUrl = `${apiBaseUrl}${endpoint}`

  console.log('[LOC HOME DEBUG]')
  console.log('API BASE URL:', apiBaseUrl)
  console.log('REQUEST URL:', fullUrl)
  console.log('METHOD: GET')

  try {
    const response = await api.get('/matches/home')
    console.log('[LOC HOME DEBUG - SUCCESS]')
    console.log('STATUS:', response.status)
    console.log('RESPONSE KEYS:', Object.keys(response.data || {}))
    return response.data
  } catch (error: any) {
    console.log('[LOC HOME DEBUG - ERROR]')
    console.log('ERROR TYPE:', error.code)
    console.log('ERROR MESSAGE:', error.message)
    console.log('HTTP STATUS:', error.response?.status)
    console.log('RESPONSE:', error.response?.data)
    throw error
  }
}

export async function getMatchById(matchId: number): Promise<MatchSummary> {
  const response = await api.get<MatchSummary>(`/matches/${matchId}`)
  return response.data
}

export async function getMatchSummary(matchId: number): Promise<MatchSummary> {
  const response = await api.get<MatchSummary>(`/matches/${matchId}/summary`)
  return response.data
}

export async function getMatchLiveState(matchId: number): Promise<MatchLiveState> {
  const response = await api.get<MatchLiveState>(`/matches/${matchId}/live-state`)
  return response.data
}

export async function getMatchCommentary(matchId: number, inningsId?: number, limit = 20, before?: string) {
  const response = await api.get(`/matches/${matchId}/commentary`, {
    params: { inningsId, limit, before },
  })
  return response.data
}

export async function getMatchInnings(matchId: number) {
  const response = await api.get(`/matches/${matchId}/innings`)
  return response.data
}

export async function getUpcomingMatches(limit = 20, offset = 0) {
  return discoverMatches('UPCOMING', limit, offset)
}

export async function getLiveMatches(limit = 20, offset = 0) {
  return discoverMatches('LIVE', limit, offset)
}

export async function getCompletedMatches(limit = 20, offset = 0) {
  return discoverMatches('RESULTS', limit, offset)
}
