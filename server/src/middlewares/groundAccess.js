import { findGroundByPublicId } from '../models/ground.model.js'
import { findCanteenByPublicId, findSingleCanteen } from '../models/canteen.model.js'
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

// ---------------------------------------------------------------------------
// Phase 10 — resolves req.canteen for the CURRENT single-ground/single-
// canteen environment instead of a URL :publicCanteenId. Every existing
// canteen route (/api/canteen/menu, /api/canteen/orders) is flat and
// carries no canteen id at all — Step 24 explicitly permits resolving the
// canteen dynamically like this for now, rather than redesigning the URL
// scheme (a later, ground-discovery phase).
// ---------------------------------------------------------------------------

// No auth/role check — for PUBLIC canteen reads (menu list) and any-
// authenticated-user actions (placing an order, viewing your own order
// history) that still need to know WHICH canteen they're operating against.
export async function attachCurrentCanteen(req, res, next) {
  try {
    const canteen = await findSingleCanteen()
    if (!canteen) {
      return res.status(404).json({ error: 'No canteen is configured yet.' })
    }
    req.canteen = canteen
    next()
  } catch (err) {
    next(err)
  }
}

// The Step 16/17 integration point: gates canteen ADMINISTRATION (menu/
// TodayMenu/order management) behind either credential —
//
//   (a) the EXISTING global staff_role_id system (super_admin/admin/
//       canteen_staff — auth.js's requireStaffRole/requireRole('staff')), or
//   (b) a real ground_users membership in one of groundRoles.
//
// This is deliberately OR, not a replacement. ground_users has ZERO rows
// today (Phase 9 report §15 — no real ground-operator identity could be
// confirmed, so nothing was ever seeded) and Phase 9's own design principle
// (Phase 9 Step 15) was an ADDITIVE rollout: "existing behavior must remain
// unchanged." Hard-requiring ground_users membership here would lock out
// every real staff account this application currently has — a functional
// regression, not a security fix, for a database where nobody has been
// granted a ground-level role yet. OR-composition can only ever ADD a path
// to success; it can never remove one an account already had, and (since
// ground_users is empty) it grants nothing extra today either. See the
// Phase 10 report's "Authorization integration" section.
//
// `legacyStaffRoles` deliberately mirrors whichever OLD check the route
// used before (requireStaffRole('super_admin','admin') for menu management
// vs requireRole('staff') — ANY staff — for order management, per the
// existing canteenMenu.routes.js comment: "canteen_staff may view/update
// orders... but not touch the menu itself"). Passing the wrong list here
// would silently WIDEN access beyond what the route already granted, so
// each call site states its own list explicitly (or 'any') rather than
// sharing one global default.
export function requireCanteenStaffAccess({ legacyStaffRoles = [], groundRoles = [] } = {}) {
  return async (req, res, next) => {
    try {
      const isLegacyStaff =
        req.user?.role === 'staff' &&
        (legacyStaffRoles === 'any' || legacyStaffRoles.includes(req.user?.staff_role))
      if (isLegacyStaff) {
        const canteen = await findSingleCanteen()
        if (!canteen) {
          return res.status(404).json({ error: 'No canteen is configured yet.' })
        }
        req.canteen = canteen
        return next()
      }
      return requireCanteenRoleForCurrentCanteen(...groundRoles)(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

// Same authorization logic as requireCanteenRole (URL-param-based), just
// resolving req.canteen from the singleton instead of :publicCanteenId — a
// thin wrapper so the membership-check logic itself is written exactly
// once (Step 13: "do not duplicate this logic separately").
function requireCanteenRoleForCurrentCanteen(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const canteen = await findSingleCanteen()
      if (!canteen) {
        return res.status(404).json({ error: 'No canteen is configured yet.' })
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
