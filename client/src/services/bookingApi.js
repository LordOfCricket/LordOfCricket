import api from './api.js'

// Ground booking client. Every number/slot here comes
// straight from the server — the client never computes
// availability itself.
export async function fetchAvailability(dateStr) {
  const { data } = await api.get('/bookings/availability', { params: { date: dateStr } })
  return data.slots
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload)
  return data.booking
}

export async function fetchMyBookings() {
  const { data } = await api.get('/bookings/my')
  return data.bookings
}

export async function cancelBooking(publicBookingId) {
  const { data } = await api.post(`/bookings/${publicBookingId}/cancel`)
  return data.booking
}

export async function fetchStaffSchedule({ from, to } = {}) {
  const { data } = await api.get('/bookings/staff/schedule', { params: { from, to } })
  return data.bookings
}

export async function createStaffBlock(payload) {
  const { data } = await api.post('/bookings/staff/block', payload)
  return data.booking
}

export async function removeStaffBlock(publicBookingId) {
  const { data } = await api.delete(`/bookings/staff/block/${publicBookingId}`)
  return data.booking
}
