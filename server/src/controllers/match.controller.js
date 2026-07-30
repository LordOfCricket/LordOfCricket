import { findFeaturedMatch, findAllMatchesWithTeams } from '../models/match.model.js'

export async function getFeaturedMatch(req, res, next) {
  try {
    const match = await findFeaturedMatch()
    res.json(match)
  } catch (err) {
    next(err)
  }
}

export async function listMatches(req, res, next) {
  try {
    const matches = await findAllMatchesWithTeams()
    res.json(matches)
  } catch (err) {
    next(err)
  }
}
