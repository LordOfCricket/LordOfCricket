import * as groundOwnerService from '../services/groundOwner.service.js'

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
    const slots = await groundOwnerService.getMatchUmpireSlots(req.ground, Number(req.params.matchId))
    res.json({ slots })
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
