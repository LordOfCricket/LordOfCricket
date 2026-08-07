import { Router } from 'express'
import { getPublicMatches, getHomeDiscovery, listMatches, getMatch, createMatchHandler, setToss, startMatch, finalizeMatch, getMatchSummary, getLiveMatchState, getMatchCommentary } from '../controllers/match.controller.js'
import { requireAuth, requireScorer } from '../middlewares/auth.js'
import { commentaryLimiter } from '../middlewares/rateLimit.js'
import { requireIntParam } from '../middlewares/validateParams.js'

const router = Router()

// Phase 10 Part 1 — public match discovery. Registered before '/:id' so
// 'discover'/'home' are never swallowed as a match id.
router.get('/discover', getPublicMatches)
router.get('/home', getHomeDiscovery)
router.get('/', listMatches)
router.post('/', requireAuth, requireScorer, createMatchHandler)
router.get('/:id', requireIntParam('id'), getMatch)
router.get('/:id/summary', requireIntParam('id'), getMatchSummary)
router.get('/:id/live-state', requireIntParam('id'), getLiveMatchState)
router.get('/:id/commentary', requireIntParam('id'), commentaryLimiter, getMatchCommentary)
router.patch('/:id/toss', requireIntParam('id'), requireAuth, requireScorer, setToss)
router.post('/:id/start', requireIntParam('id'), requireAuth, requireScorer, startMatch)
router.post('/:id/finalize', requireIntParam('id'), requireAuth, requireScorer, finalizeMatch)

export default router
