import { Router } from 'express'
import { requireAuth, requireScorer } from '../middlewares/auth.js'
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
matchScoringRoutes.post('/:matchId/match-players', requireAuth, requireScorer, addMatchPlayer)
matchScoringRoutes.get('/:matchId/innings', listInnings)
matchScoringRoutes.post('/:matchId/innings', requireAuth, requireScorer, createInnings)

// Mounted at /api/innings
export const inningsScoringRoutes = Router()
inningsScoringRoutes.get('/:inningsId/state', getInningsState)
inningsScoringRoutes.get('/:inningsId/timeline', getInningsTimeline)
inningsScoringRoutes.get('/:inningsId/wagon-wheel', getWagonWheel)
inningsScoringRoutes.post('/:inningsId/deliveries', requireAuth, requireScorer, recordDelivery)
inningsScoringRoutes.post('/:inningsId/events', requireAuth, requireScorer, recordEvent)

// Phase 4 — historical score correction
inningsScoringRoutes.post('/:inningsId/corrections/preview', requireAuth, requireScorer, previewCorrection)
inningsScoringRoutes.post('/:inningsId/corrections', requireAuth, requireScorer, applyCorrection)
inningsScoringRoutes.get('/:inningsId/corrections', requireAuth, requireScorer, listCorrections)
inningsScoringRoutes.post('/:inningsId/corrections/:correctionId/undo', requireAuth, requireScorer, undoCorrection)
