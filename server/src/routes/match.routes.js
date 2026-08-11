import { Router } from 'express'
import { getPublicMatches, getHomeDiscovery, listMatches, getMatch, createMatchHandler, setToss, startMatch, finalizeMatch, getMatchSummary, getLiveMatchState, getMatchCommentary } from '../controllers/match.controller.js'
import { requireAuth, requireScorer } from '../middlewares/auth.js'
import { requireMatchScorerByParam } from '../middlewares/matchScorerAccess.js'
import { commentaryLimiter } from '../middlewares/rateLimit.js'
import { requireIntParam } from '../middlewares/validateParams.js'

const router = Router()

// Phase 10 Part 1 — public match discovery. Registered before '/:id' so
// 'discover'/'home' are never swallowed as a match id.
router.get('/discover', getPublicMatches)
router.get('/home', getHomeDiscovery)
router.get('/', listMatches)
// createMatch has no match id yet (it's the thing being created) — Gate 2
// (match-scoped assignment) has nothing to check against here, so this stays
// on plain requireScorer, unchanged since U2. See the U3 report's "routes
// with no match context" note.
router.post('/', requireAuth, requireScorer, createMatchHandler)
router.get('/:id', requireIntParam('id'), getMatch)
router.get('/:id/summary', requireIntParam('id'), getMatchSummary)
router.get('/:id/live-state', requireIntParam('id'), getLiveMatchState)
router.get('/:id/commentary', requireIntParam('id'), commentaryLimiter, getMatchCommentary)
router.patch('/:id/toss', requireIntParam('id'), requireAuth, requireMatchScorerByParam('id'), setToss)
router.post('/:id/start', requireIntParam('id'), requireAuth, requireMatchScorerByParam('id'), startMatch)
// U3.1: the one deliberate exception to the default upcoming/live-only
// window — finalize's own precondition (match.service.js) is
// status==='completed', and the real production frontend (MatchRosterPage's
// "Review / Finalize") expects the assigned umpire to do this themselves.
// Blocking it here would make finalize unreachable for any umpire, not just
// restrict it, since 'completed' is the ONLY status finalize ever runs in.
router.post('/:id/finalize', requireIntParam('id'), requireAuth, requireMatchScorerByParam('id', { allowedStatuses: ['upcoming', 'live', 'completed'] }), finalizeMatch)

export default router
