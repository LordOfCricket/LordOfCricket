import { useQuery } from '@tanstack/react-query'
import * as groundApi from '../services/groundApi'

export function useNearbyGrounds(latitude: number, longitude: number, radiusKm = 10) {
  return useQuery({
    queryKey: ['grounds', 'nearby', latitude, longitude, radiusKm],
    queryFn: () => groundApi.getNearbyGrounds(latitude, longitude, radiusKm),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!latitude && !!longitude,
  })
}

export function useSearchGrounds(query: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['grounds', 'search', query, limit, offset],
    queryFn: () => groundApi.searchGrounds(query, limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!query && query.length > 0,
  })
}

export function useGroundDetail(publicGroundId: string) {
  return useQuery({
    queryKey: ['grounds', publicGroundId],
    queryFn: () => groundApi.getGroundById(publicGroundId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!publicGroundId,
  })
}

export function useGroundAvailability(date: string) {
  return useQuery({
    queryKey: ['grounds', 'availability', date],
    queryFn: () => groundApi.getGroundAvailability(date),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!date,
  })
}

export function useGroundTimeline(date: string) {
  return useQuery({
    queryKey: ['grounds', 'timeline', date],
    queryFn: () => groundApi.getGroundTimeline(date),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!date,
  })
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: () => groundApi.getMyBookings(),
    staleTime: 1000 * 60, // 1 minute
  })
}
