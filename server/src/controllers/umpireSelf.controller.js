import * as umpireSelfService from '../services/umpireSelf.service.js'

export async function listAvailableMatches(req, res, next) {
  try {
    const matches = await umpireSelfService.listAvailableMatches()
    res.json({ matches })
  } catch (err) {
    next(err)
  }
}

export async function listMyAssignments(req, res, next) {
  try {
    const assignments = await umpireSelfService.listMyAssignments(req.user.id)
    res.json({ assignments })
  } catch (err) {
    next(err)
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const profile = await umpireSelfService.getMyProfile(req.user.id)
    res.json({ profile })
  } catch (err) {
    next(err)
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const bio = typeof req.body?.bio === 'string' ? req.body.bio.slice(0, 500) : undefined
    const isAvailable = typeof req.body?.isAvailable === 'boolean' ? req.body.isAvailable : undefined
    const profile = await umpireSelfService.updateMyProfile(req.user.id, { bio, isAvailable })
    res.json({ profile })
  } catch (err) {
    next(err)
  }
}
