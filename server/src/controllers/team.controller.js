import { findAllTeams, findTeamById } from '../models/team.model.js'
import { findPlayersByTeam } from '../models/player.model.js'
import * as publicTeamService from '../services/publicTeam.service.js'
import * as teamRosterService from '../services/teamRoster.service.js'

// Phase 10 Part 2 — public team ecosystem (no auth, same public-read posture
// as GET /teams and GET /matches/discover).
export async function getPublicTeams(req, res, next) {
  try {
    const result = await publicTeamService.listPublicTeams({
      search: req.query.search,
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
      offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getTeamProfile(req, res, next) {
  try {
    const profile = await publicTeamService.getPublicTeamProfile(req.params.id)
    res.json(profile)
  } catch (err) {
    next(err)
  }
}

export async function listTeams(req, res, next) {
  try {
    const teams = await findAllTeams()
    res.json({ teams })
  } catch (err) {
    next(err)
  }
}

export async function getTeam(req, res, next) {
  try {
    const team = await findTeamById(req.params.id)
    if (!team) return res.status(404).json({ message: 'Team not found.' })
    res.json({ team })
  } catch (err) {
    next(err)
  }
}

export async function listTeamPlayers(req, res, next) {
  try {
    const team = await findTeamById(req.params.id)
    if (!team) return res.status(404).json({ message: 'Team not found.' })
    const players = await findPlayersByTeam(req.params.id)
    res.json({ players })
  } catch (err) {
    next(err)
  }
}

// Phase 13 — staff-only team roster management (join/leave a team's squad).
// See services/teamRoster.service.js for why this write path is needed.
export async function addTeamPlayer(req, res, next) {
  try {
    const publicPlayerId = String(req.body.publicPlayerId || '').trim()
    if (!publicPlayerId) return res.status(400).json({ message: 'publicPlayerId is required.' })

    const players = await teamRosterService.addPlayerToTeamRoster(req.params.id, publicPlayerId)
    res.status(201).json({ players })
  } catch (err) {
    next(err)
  }
}

export async function removeTeamPlayer(req, res, next) {
  try {
    const players = await teamRosterService.removePlayerFromTeamRoster(req.params.id, req.params.publicPlayerId)
    res.json({ players })
  } catch (err) {
    next(err)
  }
}
