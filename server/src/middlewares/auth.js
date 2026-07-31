import { verifyToken } from '../utils/jwt.js'
import { findUserById } from '../models/user.model.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  try {
    const payload = verifyToken(token)
    const user = await findUserById(payload.id)
    if (!user) {
      return res.status(401).json({ error: 'Invalid session.' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `${role} access required.` })
    }
    next()
  }
}
