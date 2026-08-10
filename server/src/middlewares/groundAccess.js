import { findGroundByPublicId } from '../models/ground.model.js'
import { findCanteenByPublicId } from '../models/canteen.model.js'
import { findActiveMembershipForAnyRole } from '../models/groundUser.model.js'

// Phase 9 — ground-scoped authorization primitives, additive alongside the
// existing global RBAC in auth.js (requireRole/requireStaffRole/
// requireScorer are untouched and still govern every existing route). These
// are not wired into any route yet — no route in this phase uses
// :publicGroundId/:publicCanteenId — this only builds the mechanism a later
// phase's routes will sit behind.
//
// The flow these enforce (never the reverse):
//   authenticated req.user  ->  looked-up ground/canteen row  ->  active
//   ground_users membership  ->  allowed?  ->  next()
// A client-supplied ground/canteen id is used only to look up which
// resource is being asked for; authorization always comes from a DB
// membership row keyed off req.user.id, never from the id itself.
//
// Must run after requireAuth (needs req.user).

function isSuperAdmin(user) {
  return user?.role === 'staff' && user?.staff_role === 'super_admin'
}

// Super Admin bypasses membership entirely (Step 14) — they are not required
// to hold a ground_users row for every ground merely to administer LOC.
export function requireGroundRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const ground = await findGroundByPublicId(req.params.publicGroundId)
      if (!ground) {
        return res.status(404).json({ error: 'Ground not found.' })
      }

      if (isSuperAdmin(req.user)) {
        req.ground = ground
        return next()
      }

      const membership = await findActiveMembershipForAnyRole(req.user.id, ground.id, allowedRoles)
      if (!membership) {
        return res.status(403).json({ error: 'You do not have permission to perform this action at this ground.' })
      }

      req.ground = ground
      req.groundMembership = membership
      next()
    } catch (err) {
      next(err)
    }
  }
}

// Canteen access foundation (Step 12/13): resolves the canteen's OWN
// ground_id from the database — never from the client — then runs the same
// membership check requireGroundRole does. This is what will let a future
// canteen-staff dashboard tell "Ground A's canteen" apart from "Ground B's
// canteen" for the same authenticated user.
export function requireCanteenRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const canteen = await findCanteenByPublicId(req.params.publicCanteenId)
      if (!canteen) {
        return res.status(404).json({ error: 'Canteen not found.' })
      }

      if (isSuperAdmin(req.user)) {
        req.canteen = canteen
        return next()
      }

      const membership = await findActiveMembershipForAnyRole(req.user.id, canteen.ground_id, allowedRoles)
      if (!membership) {
        return res.status(403).json({ error: 'You do not have permission to perform this action at this canteen.' })
      }

      req.canteen = canteen
      req.groundMembership = membership
      next()
    } catch (err) {
      next(err)
    }
  }
}
