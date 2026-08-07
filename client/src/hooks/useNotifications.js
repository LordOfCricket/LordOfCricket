import { useCallback, useEffect, useState } from 'react'
import { fetchMyNotifications, markNotificationRead, markAllNotificationsRead } from '../services/groundOpsApi.js'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    return fetchMyNotifications({ limit: 10 })
      .then((data) => {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const markRead = async (id) => {
    await markNotificationRead(id)
    await load()
  }

  const markAllRead = async () => {
    await markAllNotificationsRead()
    await load()
  }

  return { notifications, unreadCount, loading, markRead, markAllRead, reload: load }
}
