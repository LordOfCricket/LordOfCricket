import { Router } from 'express'
import { getFeaturedMatch, listMatches, getMatch, createMatchHandler, setToss, startMatch, finalizeMatch, getMatchSummary } from '../controllers/match.controller.js'
import { requireAuth, requireScorer } from '../middlewares/auth.js'

const router = Router()

router.get('/featured', getFeaturedMatch)
router.get('/', listMatches)
router.post('/', requireAuth, requireScorer, createMatchHandler)
router.get('/:id', getMatch)
router.get('/:id/summary', getMatchSummary)
router.patch('/:id/toss', requireAuth, requireScorer, setToss)
router.post('/:id/start', requireAuth, requireScorer, startMatch)
router.post('/:id/finalize', requireAuth, requireScorer, finalizeMatch)

export default router
