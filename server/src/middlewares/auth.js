import { verifyToken } from '../utils/jwt.js'
import { findUserById } from '../models/user.model.js'
import { isApprovedUmpireUser } from '../models/umpireRequest.model.js'

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
// APPROVED umpire. Plain 'staff' (admin/canteen_staff) is deliberately
// excluded — score editing is a super_admin-only capability.
//
// player_type='umpire' alone is NOT sufficient — it is set the moment a user
// requests umpire status (selectPlayerType), before any admin decision, so
// trusting it in isolation would let anyone grant themselves scorer access
// just by asking. The user's LATEST umpire_requests row (there may be
// several across a request/reject/re-request cycle — only the most recent
// one reflects their current standing) must have status='approved'. A
// rejected or still-pending request — or none at all — denies access, and a
// later rejection of a previously-approved request revokes it immediately,
// since this is checked live on every request rather than cached anywhere.
export async function requireScorer(req, res, next) {
  if (isSuperAdminUser(req.user)) return next()

  try {
    if (await isApprovedUmpireUser(req.user)) return next()
  } catch (err) {
    return next(err)
  }

  return res.status(403).json({ error: 'Scorer or staff access required.' })
}

// Global (this file's isSuperAdmin condition) — every requireMatchScorer call
// site (matchScorerAccess.js) reuses this exact predicate so the super-admin
// bypass is defined once, not re-implemented per gate.
export function isSuperAdminUser(user) {
  return user?.role === 'staff' && user?.staff_role === 'super_admin'
}

// U4 — the umpire's own self-service reads (available matches, my
// assignments, my profile). Deliberately NO super-admin bypass, unlike
// requireScorer/requireMatchScorer: "what are MY assignments/my profile"
// isn't a meaningful question for a staff account that isn't an umpire —
// this gate is about umpire identity, not scoring capability.
export async function requireApprovedUmpire(req, res, next) {
  try {
    if (await isApprovedUmpireUser(req.user)) return next()
  } catch (err) {
    return next(err)
  }
  return res.status(403).json({ error: 'Approved umpire access required.' })
}
