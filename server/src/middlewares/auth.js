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

// Scoring endpoints: staff (admins running the match) or an approved umpire
// (role='player', player_type='umpire' — set once umpire_requests is accepted).
export function requireScorer(req, res, next) {
  const isStaff = req.user?.role === 'staff'
  const isUmpire = req.user?.role === 'player' && req.user?.player_type === 'umpire'
  if (!isStaff && !isUmpire) {
    return res.status(403).json({ error: 'Scorer or staff access required.' })
  }
  next()
}
