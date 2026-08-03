import { findAllMatchesWithTeams, findMatchByIdWithTeams } from '../models/match.model.js'
import * as matchService from '../services/match.service.js'
import * as matchSummaryService from '../services/matchSummary.service.js'
import * as publicMatchService from '../services/publicMatch.service.js'
import * as liveMatchService from '../services/liveMatch.service.js'

// Phase 10 Part 1 — public match discovery (no auth, same public-read
// posture as GET /matches and GET /matches/:id/summary).
export async function getPublicMatches(req, res, next) {
  try {
    const result = await publicMatchService.listPublicMatches({
      category: req.query.category,
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
      offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getHomeDiscovery(req, res, next) {
  try {
    res.json(await publicMatchService.getHomeDiscovery())
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

// Phase 10 Part 3 — lightweight spectator live-state read model, meant to be
// polled every few seconds. Public, read-only; write/scoring authorization
// is completely unchanged (see scoring.routes.js).
export async function getLiveMatchState(req, res, next) {
  try {
    const state = await liveMatchService.getLiveMatchState(req.params.id)
    res.json(state)
  } catch (err) {
    next(err)
  }
}
