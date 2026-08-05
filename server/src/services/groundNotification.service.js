import * as notificationRepo from '../repositories/groundNotification.repository.js'
import { pool } from '../config/db.js'
import { logger } from '../utils/logger.js'

// Phase 18 Feature 17 — in-app notifications only. Same "best-effort,
// never blocks the primary action" posture as audit logging (§ groundAuditLog
// .service.js) and Google Calendar sync — a notification failing to write
// must never fail the booking/cancellation that triggered it.
export async function createNotification({ userId, type, title, body = null, relatedBookingId = null }) {
  try {
    return await notificationRepo.insertNotification(pool, { userId, type, title, body, relatedBookingId })
  } catch (err) {
    logger.error('Ground notification write failed', { userId, type, error: err.message })
    return null
  }
}

export async function listMyNotifications(userId, { limit = 20, offset = 0 } = {}) {
  const { rows, total } = await notificationRepo.listForUser(userId, { limit, offset })
  const unreadCount = await notificationRepo.countUnread(userId)
  return { notifications: rows, total, unreadCount }
}

export async function markRead(notificationId, userId) {
  return notificationRepo.markRead(notificationId, userId)
}

export async function markAllRead(userId) {
  return notificationRepo.markAllRead(userId)
}
