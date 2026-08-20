import api from './api'
import { Player, EditablePlayerFields, PlayerStats } from '../types'

/**
 * GET /me/player
 * Fetch the authenticated user's player profile
 * Backend returns { player: Player }, we unwrap to Player
 */
export async function fetchMyPlayer(): Promise<Player> {
  const response = await api.get<{ player: Player }>('/me/player')
  return response.data.player
}

/**
 * PATCH /me/player
 * Update the authenticated user's player profile
 * Only submitted fields are updated; unsubmitted fields remain unchanged
 * Accepts null to clear optional fields
 * Backend returns { player: Player }, we unwrap to Player
 */
export async function updateMyPlayer(updates: EditablePlayerFields): Promise<Player> {
  const response = await api.patch<{ player: Player }>('/me/player', updates)
  return response.data.player
}

/**
 * POST /me/player/photo
 * Upload a profile photo
 * Backend expects multipart FormData with 'photo' field
 * File must be JPEG, PNG, or WEBP; max 10MB
 * Returns updated player object with new photo_url
 * Backend returns { player: Player }, we unwrap to Player
 */
export async function uploadPlayerPhoto(file: Blob): Promise<Player> {
  const formData = new FormData()
  formData.append('photo', file)

  const response = await api.post<{ player: Player }>('/me/player/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.player
}

/**
 * GET /me/stats
 * Fetch the authenticated user's career statistics
 * Includes career stats, recent form, and paginated match history
 */
export async function getMyPlayerStats(limit: number = 10, offset: number = 0): Promise<PlayerStats> {
  const response = await api.get<PlayerStats>('/me/stats', {
    params: { limit, offset },
  })
  return response.data
}

/**
 * GET /players/:publicPlayerId
 * Fetch public player profile information
 * No authentication required
 * Backend returns { player: Player }, we unwrap to Player
 */
export async function getPublicPlayerProfile(publicPlayerId: string): Promise<Player> {
  const response = await api.get<{ player: Player }>(`/players/${publicPlayerId}`)
  return response.data.player
}

/**
 * GET /players/:publicPlayerId/stats
 * Fetch public player statistics
 * No authentication required
 * Includes career stats, recent form, and paginated match history
 */
export async function getPublicPlayerStats(
  publicPlayerId: string,
  limit: number = 10,
  offset: number = 0
): Promise<PlayerStats> {
  const response = await api.get<PlayerStats>(`/players/${publicPlayerId}/stats`, {
    params: { limit, offset },
  })
  return response.data
}
