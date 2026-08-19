import api from './api'
import { Ground } from '../types'

export async function getNearbyGrounds(latitude: number, longitude: number, radiusKm = 10) {
  const response = await api.get('/grounds/nearby', {
    params: {
      latitude,
      longitude,
      radiusKm,
    },
  })
  return response.data
}

export async function getGroundById(publicGroundId: string): Promise<Ground> {
  const response = await api.get<Ground>(`/grounds/${publicGroundId}`)
  return response.data
}

export async function searchGrounds(query: string, limit = 20, offset = 0) {
  const response = await api.get('/geocode', { params: { q: query, limit, offset } })
  return response.data
}

export async function getGroundAvailability(date: string) {
  const response = await api.get('/bookings/availability', { params: { date } })
  return response.data
}

export async function getGroundTimeline(date: string) {
  const response = await api.get('/ground/timeline', { params: { date } })
  return response.data
}

export async function getAvailability(date: string) {
  const response = await api.get('/bookings/availability', { params: { date } })
  return response.data
}

export async function getMyBookings() {
  const response = await api.get('/bookings/my')
  return response.data
}

export async function createBooking(booking: {
  startTime: string
  purpose?: string
  expectedPlayers?: number
  notes?: string
  contactPhone?: string
  contactEmail?: string
  clientActionId?: string
}) {
  const response = await api.post('/bookings', booking)
  return response.data
}

export async function cancelBooking(publicBookingId: string) {
  const response = await api.post(`/bookings/${publicBookingId}/cancel`)
  return response.data
}

export async function createTeamBooking(
  publicGroundId: string,
  bookingPurpose: 'MATCH' | 'PRACTICE',
  startTime: string,
  endTime: string,
  teamId: number,
  participantPlayerIds: number[]
) {
  const response = await api.post(`/grounds/${publicGroundId}/bookings`, {
    bookingPurpose,
    startTime,
    endTime,
    teamId,
    participantPlayerIds,
  })
  return response.data
}

export async function getMyBookings() {
  const response = await api.get('/bookings/my')
  return response.data
}

export async function cancelBooking(publicBookingId: string) {
  const response = await api.post(`/bookings/${publicBookingId}/cancel`)
  return response.data
}
