import {
  fetchActiveOrder,
  fetchMenu,
  fetchOrder,
  fetchOrderHistory,
  placeOrder,
} from '../services/canteenApi.js'

export { fetchActiveOrder, fetchMenu, fetchOrder, fetchOrderHistory, placeOrder }

export const defaultCart = {
  items: [],
  total: 0,
}

export const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
export const activeStatuses = ['Pending', 'Accepted', 'Preparing', 'Ready']
export const CANTEEN_LATEST_ORDER_STORAGE_KEY = 'canteenLatestOrder'

export function formatOrderDate(value) {
  if (!value) return 'Unknown date'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatOrderTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function statusClass(status) {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Cancelled') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

export function computeCartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}
