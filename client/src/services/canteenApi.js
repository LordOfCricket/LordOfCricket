import axios from 'axios'
import { getStoredToken } from '../utils/authToken.js'

// The merged backend serves canteen routes under /api/canteen (see server/src/app.js).
// VITE_API_URL already points at ".../api" (e.g. http://localhost:5000/api),
// same as the LOC client, so we just add the "/canteen" segment here.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/canteen`,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchMenu() {
  const response = await api.get('/menu')
  return response.data.items
}

export async function fetchMasterMenu() {
  const response = await api.get('/menu/master')
  return response.data.items
}

export async function createMenuItem(payload) {
  if (payload instanceof FormData) {
    const response = await api.post('/menu/master', payload)
    return response.data.item
  }

  const response = await api.post('/menu/master', payload)
  return response.data.item
}

export async function updateMenuItem(id, payload) {
  if (payload instanceof FormData) {
    const response = await api.patch(`/menu/master/${id}`, payload)
    return response.data.item
  }

  const response = await api.patch(`/menu/master/${id}`, payload)
  return response.data.item
}

export async function deleteMenuItem(id) {
  const response = await api.delete(`/menu/master/${id}`)
  return response.data
}

export async function lookupOrderByUser(userId) {
  const response = await api.get('/orders/lookup', { params: { userId } })
  return response.data.order
}

export async function fetchActiveOrder(userId) {
  const response = await api.get(`/orders/active/${userId}`)
  return response.data.order
}

export async function fetchOrderHistory(userId) {
  const response = await api.get(`/orders/history/${userId}`)
  return response.data.orders
}

export async function fetchTodaysMenuConfig() {
  const response = await api.get('/menu/today/config')
  return response.data
}

export async function publishTodaysMenu(payload) {
  const response = await api.patch('/menu/today', payload)
  return response.data
}

export async function placeOrder(payload) {
  const response = await api.post('/orders', payload)
  return response.data.order
}

export async function fetchOrder(orderId) {
  const response = await api.get(`/orders/${orderId}`)
  return response.data.order
}

export async function fetchOrders(page = 1, limit = 5, status) {
  const response = await api.get('/orders', { params: { page, limit, status } })
  return response.data
}

export async function updateOrderStatus(orderId, status) {
  const response = await api.patch(`/orders/${orderId}/status`, { status })
  return response.data.order
}

export default api
