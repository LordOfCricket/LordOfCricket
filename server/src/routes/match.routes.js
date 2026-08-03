import { Router } from 'express'
import { getPublicMatches, getHomeDiscovery, listMatches, getMatch, createMatchHandler, setToss, startMatch, finalizeMatch, getMatchSummary, getLiveMatchState } from '../controllers/match.controller.js'
import { requireAuth, requireScorer } from '../middlewares/auth.js'

const router = Router()

// Phase 10 Part 1 — public match discovery. Registered before '/:id' so
// 'discover'/'home' are never swallowed as a match id.
router.get('/discover', getPublicMatches)
router.get('/home', getHomeDiscovery)
router.get('/', listMatches)
router.post('/', requireAuth, requireScorer, createMatchHandler)
router.get('/:id', getMatch)
router.get('/:id/summary', getMatchSummary)
router.get('/:id/live-state', getLiveMatchState)
router.patch('/:id/toss', requireAuth, requireScorer, setToss)
router.post('/:id/start', requireAuth, requireScorer, startMatch)
router.post('/:id/finalize', requireAuth, requireScorer, finalizeMatch)

export default router
