// Umpire Communication & Commercial 2.0 — match-scoped chat realtime.
// Mirrors cricketRealtime.js's additive registration pattern (a separate
// `register*Realtime(io)` module, one more io.on('connection', ...)
// listener, never a second Socket.IO server) but adds something
// cricketRealtime.js's spectator room deliberately doesn't have: a real
// participant-authorization check before joining. The public `match:${id}`
// spectator room is left untouched — this uses its own `match-chat:${id}`
// room so a private chat message can never leak into the public spectator
// broadcast.
import { verifyToken } from '../utils/jwt.js'
import { findUserById } from '../models/user.model.js'
import { resolveSenderRole } from '../services/matchAccess.service.js'
import { isSuperAdminUser } from '../middlewares/auth.js'
import { logger } from '../utils/logger.js'

export function matchChatRoom(matchId) {
  return `match-chat:${matchId}`
}

// No existing socket handler in this codebase authenticates the caller
// (confirmed by audit — join-match/join-order-room trust the payload
// alone). Chat is participant-only, so this is the first join handler that
// must verify a real identity: the client sends its existing JWT (the same
// token already used for every REST call) as part of the join payload.
async function authenticateSocketUser(token) {
  if (!token) return null
  try {
    const payload = verifyToken(token)
    return await findUserById(payload.id)
  } catch {
    return null
  }
}

export function registerMatchChatRealtime(io) {
  io.on('connection', (socket) => {
    socket.on('join-match-chat', async (payload) => {
      const matchId = Number(payload?.matchId)
      if (!Number.isInteger(matchId) || matchId <= 0) {
        socket.emit('match:error', { message: 'A valid matchId is required to join match chat.' })
        return
      }
      try {
        const user = await authenticateSocketUser(payload?.token)
        if (!user) {
          socket.emit('match:error', { message: 'Authentication required to join match chat.' })
          return
        }
        if (!isSuperAdminUser(user)) {
          const resolved = await resolveSenderRole(matchId, user)
          if (!resolved) {
            socket.emit('match:error', { message: 'You are not a participant in this match.' })
            return
          }
        }
        socket.join(matchChatRoom(matchId))
      } catch (err) {
        logger.error('join-match-chat failed', { matchId, error: err.message })
        socket.emit('match:error', { message: 'Could not join match chat.' })
      }
    })

    socket.on('leave-match-chat', (payload) => {
      const matchId = Number(payload?.matchId)
      if (Number.isInteger(matchId) && matchId > 0) socket.leave(matchChatRoom(matchId))
    })
  })
}

// Same fire-and-forget/best-effort contract as publishMatchState/
// publishCommentary — a broadcast failure must never surface as a message-
// send failure; the DB insert already committed, delivery is best-effort.
export function publishMatchMessage(io, matchId, message) {
  if (!io || matchId == null) return
  try {
    io.to(matchChatRoom(matchId)).emit('match:message', message)
  } catch (err) {
    logger.error('Match message publish failed', { matchId, error: err.message })
  }
}
