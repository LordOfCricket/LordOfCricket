import { findFeaturedMatch, findAllMatchesWithTeams, findMatchByIdWithTeams } from '../models/match.model.js'
import * as matchService from '../services/match.service.js'
import * as matchSummaryService from '../services/matchSummary.service.js'

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

export async function getMatch(req, res, next) {
  try {
    const match = await findMatchByIdWithTeams(req.params.id)
    if (!match) return res.status(404).json({ message: 'Match not found.' })
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function createMatchHandler(req, res, next) {
  try {
    const match = await matchService.createMatch(req.body)
    res.status(201).json({ match })
  } catch (err) {
    next(err)
  }
}

export async function setToss(req, res, next) {
  try {
    const match = await matchService.setToss(req.params.id, req.body)
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function startMatch(req, res, next) {
  try {
    const match = await matchService.startMatch(req.params.id)
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

export async function finalizeMatch(req, res, next) {
  try {
    const match = await matchService.finalizeMatch(req.params.id)
    res.json({ match })
  } catch (err) {
    next(err)
  }
}

// Phase 9 — public match summary/scorecard read model. No auth: consistent
// with GET /matches and GET /matches/:id's existing public-read posture.
export async function getMatchSummary(req, res, next) {
  try {
    const summary = await matchSummaryService.getMatchSummary(req.params.id)
    res.json(summary)
  } catch (err) {
    next(err)
  }
}
