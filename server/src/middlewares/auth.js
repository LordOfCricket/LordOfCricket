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

// Finer-grained than requireRole('staff'): also checks the user's staff_role
// (super_admin | admin | canteen_staff, resolved via requireAuth's
// findUserById JOIN — see user.model.js). A staff row with no staff_role_id
// assigned resolves staff_role = null, which never matches any allowedNames
// list, so it is safely denied rather than crashing.
export function requireStaffRole(...allowedNames) {
  return (req, res, next) => {
    if (req.user?.role !== 'staff' || !allowedNames.includes(req.user?.staff_role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' })
    }
    next()
  }
}

// Scoring endpoints: super_admin staff (the LOC-authorized scorer role) or an
// approved umpire (role='player', player_type='umpire' — set once
// umpire_requests is accepted). Plain 'staff' (admin/canteen_staff) is
// deliberately excluded — score editing is a super_admin-only capability.
export function requireScorer(req, res, next) {
  const isSuperAdmin = req.user?.role === 'staff' && req.user?.staff_role === 'super_admin'
  const isUmpire = req.user?.role === 'player' && req.user?.player_type === 'umpire'
  if (!isSuperAdmin && !isUmpire) {
    return res.status(403).json({ error: 'Scorer or staff access required.' })
  }
  next()
}
