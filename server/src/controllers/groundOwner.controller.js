import * as groundOwnerService from '../services/groundOwner.service.js'
import { recommendUmpiresForMatch } from '../services/umpireRecommendation.service.js'
import {
  createStaffForGround,
  listStaffForGround,
  listPermissionCatalog,
  grantStaffPermission,
  revokeStaffPermission,
  disableStaffMembership,
} from '../services/groundStaff.service.js'

export async function listMyGrounds(req, res, next) {
  try {
    const grounds = await groundOwnerService.listMyGrounds(req.user.id)
    res.json({ grounds })
  } catch (err) {
    next(err)
  }
}

// req.ground is resolved + authorized by requireGroundRole('GROUND_OWNER')
// before this ever runs — req.params.publicGroundId is only ever used to
// look up WHICH ground was requested, never trusted for the authorization
// decision itself.
export async function listGroundMatches(req, res, next) {
  try {
    const matches = await groundOwnerService.listGroundMatches(req.ground)
    res.json({ matches })
  } catch (err) {
    next(err)
  }
}

export async function createGroundMatch(req, res, next) {
  try {
    const { teamAId, teamBId, matchDate, requiredUmpires, oversPerInnings, ballsPerOver } = req.body
    const match = await groundOwnerService.createGroundMatch(req.ground, {
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      matchDate,
      requiredUmpires: requiredUmpires != null ? Number(requiredUmpires) : 0,
      oversPerInnings: oversPerInnings != null ? Number(oversPerInnings) : null,
      ballsPerOver: ballsPerOver != null ? Number(ballsPerOver) : undefined,
    })
    res.status(201).json({ match })
  } catch (err) {
    next(err)
  }
}

// req.ground is authorized+resolved; req.params.matchId is only ever used
// to look up WHICH match, never trusted for the ownership decision itself —
// groundOwnerService.resolveOwnedMatch (internal) re-verifies match.ground_id
// on every one of these three actions.
export async function getGroundMatchUmpireSlots(req, res, next) {
  try {
    const { slots, umpireFee } = await groundOwnerService.getMatchUmpireSlots(req.ground, Number(req.params.matchId))
    res.json({ slots, umpireFee })
  } catch (err) {
    next(err)
  }
}

export async function getUmpireOperationsSummary(req, res, next) {
  try {
    const summary = await groundOwnerService.getUmpireOperationsSummary(req.ground)
    res.json({ summary })
  } catch (err) {
    next(err)
  }
}

export async function getRecommendedUmpires(req, res, next) {
  try {
    const candidates = await recommendUmpiresForMatch(req.ground, Number(req.params.matchId), {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })
    res.json({ candidates })
  } catch (err) {
    next(err)
  }
}

export async function setGroundMatchUmpireFee(req, res, next) {
  try {
    const match = await groundOwnerService.setMatchUmpireFee(req.ground, Number(req.params.matchId), req.user.id, {
      amount: req.body?.amount,
      currency: req.body?.currency,
    })
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function updateGroundMatchSlotPaymentStatus(req, res, next) {
  try {
    const earning = await groundOwnerService.updateSlotPaymentStatus(
      req.ground,
      Number(req.params.matchId),
      Number(req.params.slotId),
      req.body?.status,
    )
    res.json({ earning })
  } catch (err) {
    next(err)
  }
}

export async function startGroundMatch(req, res, next) {
  try {
    const match = await groundOwnerService.startGroundMatch(req.ground, Number(req.params.matchId), {
      confirmUnderstaffed: req.body?.confirmUnderstaffed === true,
    })
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function completeGroundMatch(req, res, next) {
  try {
    const match = await groundOwnerService.completeGroundMatch(req.ground, Number(req.params.matchId))
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function markUmpireNoShow(req, res, next) {
  try {
    const slot = await groundOwnerService.markMatchUmpireNoShow(req.ground, Number(req.params.matchId), Number(req.params.slotId), req.user.id)
    res.json({ slot })
  } catch (err) {
    next(err)
  }
}

export async function getEligibleReplacements(req, res, next) {
  try {
    const candidates = await groundOwnerService.listEligibleReplacements(req.ground, Number(req.params.matchId), Number(req.params.slotId))
    res.json({ candidates })
  } catch (err) {
    next(err)
  }
}

export async function assignReplacementUmpire(req, res, next) {
  try {
    const newUmpireUserId = Number(req.body?.newUmpireUserId)
    if (!Number.isInteger(newUmpireUserId)) return res.status(400).json({ error: 'newUmpireUserId is required.' })
    const slot = await groundOwnerService.assignReplacementUmpire(
      req.ground,
      Number(req.params.matchId),
      Number(req.params.slotId),
      newUmpireUserId,
      req.user.id,
    )
    res.json({ slot })
  } catch (err) {
    next(err)
  }
}

export async function getMatchAssignmentHistory(req, res, next) {
  try {
    const events = await groundOwnerService.getMatchAssignmentHistory(req.ground, Number(req.params.matchId))
    res.json({ events })
  } catch (err) {
    next(err)
  }
}

export async function getMatchIncidents(req, res, next) {
  try {
    const incidents = await groundOwnerService.getMatchIncidents(req.ground, Number(req.params.matchId))
    res.json({ incidents })
  } catch (err) {
    next(err)
  }
}

// Phase 4 — ground-scoped Staff (GROUND_ADMIN/CANTEEN_STAFF), distinct from
// the platform-wide staff.controller.js. req.ground is already resolved +
// ownership-verified by requireGroundRole('GROUND_OWNER'); req.user.id is
// only ever used as the audit log's actor, never trusted for authorization.
export async function createGroundStaff(req, res, next) {
  try {
    const { name, identifier, role } = req.body || {}
    const { user, membership } = await createStaffForGround(req.ground, { name, identifier, role }, req.user.id)
    res.status(201).json({ user, membership })
  } catch (err) {
    next(err)
  }
}

export async function listGroundStaff(req, res, next) {
  try {
    const staff = await listStaffForGround(req.ground)
    res.json({ staff })
  } catch (err) {
    next(err)
  }
}

// Phase 5 — granular Staff permissions. req.ground is resolved by
// requireGroundRole('GROUND_OWNER') (routes.js) — these four actions are
// never reachable via requireGroundPermission, so a staff member can never
// call them regardless of what they've been granted.
export async function getPermissionCatalog(req, res, next) {
  try {
    const permissions = await listPermissionCatalog()
    res.json({ permissions })
  } catch (err) {
    next(err)
  }
}

export async function grantStaffPermissionHandler(req, res, next) {
  try {
    await grantStaffPermission(req.ground, Number(req.params.membershipId), req.body?.permissionKey, req.user.id, req.session?.id)
    res.status(201).json({ granted: true })
  } catch (err) {
    next(err)
  }
}

export async function revokeStaffPermissionHandler(req, res, next) {
  try {
    await revokeStaffPermission(req.ground, Number(req.params.membershipId), req.params.permissionKey, req.user.id)
    res.json({ revoked: true })
  } catch (err) {
    next(err)
  }
}

export async function disableStaffMembershipHandler(req, res, next) {
  try {
    await disableStaffMembership(req.ground, Number(req.params.membershipId), req.user.id, req.session?.id)
    res.json({ disabled: true })
  } catch (err) {
    next(err)
  }
}
