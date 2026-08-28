import api from './api'

export interface GroundDetail {
  publicGroundId: string
  name: string
  addressLine: string | null
  city: string | null
  state: string | null
  primaryPhoto: string | null
}

export interface FeaturedGround {
  publicGroundId: string
  name: string
  city: string | null
  state: string | null
  primaryPhoto: string | null
}

export interface FeaturedGroundsResponse {
  grounds: FeaturedGround[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/**
 * GET /grounds
 * Registered grounds on LOC — same public endpoint the website's
 * "Find Your Perfect Ground" section uses.
 */
export async function getFeaturedGrounds(limit = 8): Promise<FeaturedGroundsResponse> {
  const response = await api.get<FeaturedGroundsResponse>('/grounds', { params: { page: 1, limit } })
  return response.data
}

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

/**
 * GET /grounds/:publicGroundId
 * Response is { ground: {...}, photos: [...], ... } — unwrap `ground`
 * and attach the first photo as `primaryPhoto` for convenience.
 */
export async function getGroundById(publicGroundId: string): Promise<GroundDetail> {
  const response = await api.get<{ ground: GroundDetail; photos: { imageUrl: string }[] }>(
    `/grounds/${publicGroundId}`
  )
  return {
    ...response.data.ground,
    primaryPhoto: response.data.photos?.[0]?.imageUrl ?? null,
  }
}

export async function searchGrounds(query: string, limit = 20, offset = 0) {
  const response = await api.get('/geocode', { params: { q: query, limit, offset } })
  return response.data
}

export async function getAvailability(date: string, publicGroundId?: string) {
  const response = await api.get('/bookings/availability', { params: { date, publicGroundId } })
  return response.data
}

export async function getGroundTimeline(date: string) {
  const response = await api.get('/ground/timeline', { params: { date } })
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
  publicGroundId?: string
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
