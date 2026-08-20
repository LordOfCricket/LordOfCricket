import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationApi from '../services/notificationApi'

const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit: number, offset: number) => [...notificationKeys.all, 'list', limit, offset] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}

export function useNotifications(limit: number = 20, offset: number = 0, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(limit, offset),
    queryFn: () => notificationApi.getNotifications(limit, offset),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: number) => notificationApi.markNotificationRead(notificationId),
    onSuccess: (notification) => {
      // Invalidate all notification queries to refresh unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
