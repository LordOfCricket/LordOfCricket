import * as followService from '../services/follow.service.js'

export async function followPlayerHandler(req, res, next) {
  try {
    res.json(await followService.followPlayer(req.user.id, req.params.publicPlayerId))
  } catch (err) {
    next(err)
  }
}

export async function unfollowPlayerHandler(req, res, next) {
  try {
    res.json(await followService.unfollowPlayer(req.user.id, req.params.publicPlayerId))
  } catch (err) {
    next(err)
  }
}

export async function playerFollowStateHandler(req, res, next) {
  try {
    res.json(await followService.getPlayerFollowState(req.user.id, req.params.publicPlayerId))
  } catch (err) {
    next(err)
  }
}

export async function followTeamHandler(req, res, next) {
  try {
    res.json(await followService.followTeam(req.user.id, req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function unfollowTeamHandler(req, res, next) {
  try {
    res.json(await followService.unfollowTeam(req.user.id, req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function teamFollowStateHandler(req, res, next) {
  try {
    res.json(await followService.getTeamFollowState(req.user.id, req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function listFollowingHandler(req, res, next) {
  try {
    res.json(
      await followService.listFollowing(req.user.id, {
        playersLimit: req.query.playersLimit,
        playersOffset: req.query.playersOffset,
        teamsLimit: req.query.teamsLimit,
        teamsOffset: req.query.teamsOffset,
      })
    )
  } catch (err) {
    next(err)
  }
}
