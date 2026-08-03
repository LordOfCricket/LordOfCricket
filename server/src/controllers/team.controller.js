import { findAllTeams, findTeamById } from '../models/team.model.js'
import { findPlayersByTeam } from '../models/player.model.js'

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
