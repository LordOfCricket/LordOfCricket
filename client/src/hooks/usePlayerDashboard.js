import { useEffect, useState } from 'react'
import { fetchActiveOrder, fetchOrderHistory } from '../services/canteenApi.js'
import { fetchTeam } from '../services/playerApi.js'
import { summarizeOrders } from '../models/playerDashboard.model.js'
import { useAuth } from './useAuth.js'

export function usePlayerDashboard() {
  const { user, player, refreshPlayer } = useAuth()
  const [team, setTeam] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [canteenError, setCanteenError] = useState('')

  useEffect(() => {
    if (!player) refreshPlayer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user?.id) return

    Promise.all([fetchActiveOrder(user.id), fetchOrderHistory(user.id)])
      .then(([active, history]) => {
        setActiveOrder(active)
        setOrderHistory(history)
      })
      .catch((err) => setCanteenError(err.response?.data?.error || 'Unable to load canteen activity.'))
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!player?.team_id) return undefined
    let cancelled = false
    fetchTeam(player.team_id)
      .then((fetchedTeam) => {
        if (!cancelled) setTeam(fetchedTeam)
      })
      .catch(() => {
        if (!cancelled) setTeam(null)
      })
    return () => {
      cancelled = true
    }
  }, [player?.team_id])

  const isNewPlayer = !player?.role && !player?.team_id

  return {
    user,
    player,
    team: player?.team_id ? team : null,
    isNewPlayer,
    activeOrder,
    recentOrders: orderHistory.slice(0, 3),
    canteenLoading: loading,
    canteenError,
    ...summarizeOrders(orderHistory),
  }
}
