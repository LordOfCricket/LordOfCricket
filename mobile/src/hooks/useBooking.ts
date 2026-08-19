import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { randomUUID } from 'expo-crypto'
import { Availability, Booking, BookingRequest } from '../types'
import * as groundApi from '../services/groundApi'

/**
 * Fetch available slots for a given date.
 * Public API — no auth required to view availability.
 */
export function useAvailability(date: string | null, enabled = true) {
  return useQuery({
    queryKey: ['availability', date],
    queryFn: async () => {
      if (!date) return null
      const response = await groundApi.getAvailability(date)
      return response as Availability
    },
    enabled: enabled && !!date,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minute cache
  })
}

/**
 * Fetch user's bookings.
 * Authenticated.
 */
export function useMyBookings(enabled = true) {
  return useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const response = await groundApi.getMyBookings()
      return response.bookings as Booking[]
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minute cache
  })
}

/**
 * Create a new booking with idempotency support.
 * Generates clientActionId to prevent double submissions.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (booking: Omit<BookingRequest, 'clientActionId'>) => {
      // Generate idempotency key once per user action
      const clientActionId = randomUUID()

      const response = await groundApi.createBooking({
        ...booking,
        clientActionId,
      })

      return response.booking as Booking
    },
    onSuccess: (booking) => {
      // Invalidate availability for the booked date
      const bookingDate = new Date(booking.startTime).toISOString().slice(0, 10)
      queryClient.invalidateQueries({ queryKey: ['availability', bookingDate] })

      // Invalidate my bookings list
      queryClient.invalidateQueries({ queryKey: ['myBookings'] })

      // Optionally cache the newly created booking
      queryClient.setQueryData(['booking', booking.publicBookingId], booking)
    },
    onError: (error: any) => {
      // Error is handled by caller for user-facing display
    },
  })
}

/**
 * Cancel an existing booking.
 */
export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (publicBookingId: string) => {
      const response = await groundApi.cancelBooking(publicBookingId)
      return response.booking as Booking
    },
    onSuccess: (booking) => {
      // Invalidate availability for the cancelled booking's date
      const bookingDate = new Date(booking.startTime).toISOString().slice(0, 10)
      queryClient.invalidateQueries({ queryKey: ['availability', bookingDate] })

      // Invalidate my bookings list
      queryClient.invalidateQueries({ queryKey: ['myBookings'] })

      // Clear the cached booking
      queryClient.removeQueries({ queryKey: ['booking', booking.publicBookingId] })
    },
  })
}
