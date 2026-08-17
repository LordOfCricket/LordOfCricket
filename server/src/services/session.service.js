import { generateSessionToken, hashSessionToken } from '../domain/otpAuth/sessionToken.js'
import { getSessionTtlDays } from '../domain/otpAuth/otp.js'
import { createSession, findActiveSessionByTokenHash, touchLastUsed, revokeSessionByTokenHash } from '../repositories/prisma/session.prisma-repository.js'
import { logger } from '../utils/logger.js'

export async function createSessionForUser(userId, { ipAddress = null, userAgent = null } = {}) {
  const rawToken = generateSessionToken()
  const tokenHash = hashSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + getSessionTtlDays() * 24 * 60 * 60 * 1000)

  await createSession({ userId, tokenHash, expiresAt, ipAddress, userAgent })
  logger.info('Session created', { userId })

  return { rawToken, expiresAt }
}

// Returns the session row (with `user_id`) if `rawToken` maps to a
// currently active, unexpired, unrevoked session — null otherwise. Never
// throws; middlewares/session.js decides what "no valid session" means for
// the request (fall through to the legacy JWT path, or 401).
export async function validateSessionToken(rawToken) {
  const tokenHash = hashSessionToken(rawToken)
  const session = await findActiveSessionByTokenHash(tokenHash)
  if (!session) return null

  await touchLastUsed(session.id)
  return session
}

export async function revokeSession(rawToken) {
  const tokenHash = hashSessionToken(rawToken)
  await revokeSessionByTokenHash(tokenHash)
  logger.info('Session revoked (logout)')
}
