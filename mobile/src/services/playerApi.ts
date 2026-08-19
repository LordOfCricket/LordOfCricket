import api from './api'
import { Player } from '../types'

export async function fetchMyPlayer(): Promise<Player> {
  const response = await api.get<Player>('/me/player')
  return response.data
}

export async function updateMyPlayer(fields: Partial<Player>): Promise<Player> {
  const response = await api.patch<Player>('/me/player', fields)
  return response.data
}

export async function getPlayerById(publicPlayerId: string): Promise<Player> {
  const response = await api.get<Player>(`/players/${publicPlayerId}`)
  return response.data
}

export async function searchPlayers(query: string) {
  const response = await api.get('/players', { params: { search: query } })
  return response.data
}
