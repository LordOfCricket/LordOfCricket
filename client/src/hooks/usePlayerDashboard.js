import { useEffect, useState } from 'react'
import { fetchActiveOrder, fetchOrderHistory } from '../services/canteenApi.js'
import { summarizeOrders } from '../models/playerDashboard.model.js'
import { useAuth } from './useAuth.js'

export function usePlayerDashboard() {
  const { user } = useAuth()
  const [activeOrder, setActiveOrder] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return

    Promise.all([fetchActiveOrder(user.id), fetchOrderHistory(user.id)])
      .then(([active, history]) => {
        setActiveOrder(active)
        setOrderHistory(history)
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load your dashboard.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  return {
    user,
    activeOrder,
    recentOrders: orderHistory.slice(0, 3),
    loading,
    error,
    ...summarizeOrders(orderHistory),
  }
}
