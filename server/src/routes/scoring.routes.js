import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { requireMatchScorerByParam, requireMatchScorerByInnings } from '../middlewares/matchScorerAccess.js'
import {
  createInnings,
  listInnings,
  addMatchPlayer,
  listMatchPlayers,
  getInningsState,
  getInningsTimeline,
  getWagonWheel,
  recordDelivery,
  recordEvent,
} from '../controllers/scoring.controller.js'
import { previewCorrection, applyCorrection, listCorrections, undoCorrection } from '../controllers/correction.controller.js'

// Mounted at /api/matches
export const matchScoringRoutes = Router()
matchScoringRoutes.get('/:matchId/match-players', listMatchPlayers)
matchScoringRoutes.post('/:matchId/match-players', requireAuth, requireMatchScorerByParam('matchId'), addMatchPlayer)
matchScoringRoutes.get('/:matchId/innings', listInnings)
matchScoringRoutes.post('/:matchId/innings', requireAuth, requireMatchScorerByParam('matchId'), createInnings)

// Mounted at /api/innings
export const inningsScoringRoutes = Router()
inningsScoringRoutes.get('/:inningsId/state', getInningsState)
inningsScoringRoutes.get('/:inningsId/timeline', getInningsTimeline)
inningsScoringRoutes.get('/:inningsId/wagon-wheel', getWagonWheel)
inningsScoringRoutes.post('/:inningsId/deliveries', requireAuth, requireMatchScorerByInnings('inningsId'), recordDelivery)
inningsScoringRoutes.post('/:inningsId/events', requireAuth, requireMatchScorerByInnings('inningsId'), recordEvent)

// Phase 4 — historical score correction
inningsScoringRoutes.post('/:inningsId/corrections/preview', requireAuth, requireMatchScorerByInnings('inningsId'), previewCorrection)
inningsScoringRoutes.post('/:inningsId/corrections', requireAuth, requireMatchScorerByInnings('inningsId'), applyCorrection)
inningsScoringRoutes.get('/:inningsId/corrections', requireAuth, requireMatchScorerByInnings('inningsId'), listCorrections)
inningsScoringRoutes.post('/:inningsId/corrections/:correctionId/undo', requireAuth, requireMatchScorerByInnings('inningsId'), undoCorrection)
