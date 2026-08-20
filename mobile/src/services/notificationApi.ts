import api from './api'
import { Notification, NotificationsResponse } from '../types'

export async function getNotifications(limit: number = 20, offset: number = 0): Promise<NotificationsResponse> {
  const response = await api.get<NotificationsResponse>('/ground/notifications', {
    params: { limit, offset },
  })
  return response.data
}

export async function markNotificationRead(notificationId: number): Promise<Notification> {
  const response = await api.post<{ notification: Notification }>(`/ground/notifications/${notificationId}/read`)
  return response.data.notification
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/ground/notifications/read-all')
}
