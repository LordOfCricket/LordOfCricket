import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { requireGroundRole } from '../middlewares/groundAccess.js'
import {
  listMyGrounds,
  listGroundMatches,
  createGroundMatch,
  getGroundMatchUmpireSlots,
  startGroundMatch,
  completeGroundMatch,
} from '../controllers/groundOwner.controller.js'

// Mounted at /api/ground-owner. Reuses requireGroundRole('GROUND_OWNER')
// exactly as-is (groundAccess.js, Phase 9) — same :publicGroundId param
// shape it already expects, so ownership is enforced by a real ground_users
// row lookup on every request, never by trusting the URL. Super admin
// bypasses per that middleware's existing, unchanged behavior.
const router = Router()
router.get('/grounds', requireAuth, listMyGrounds)
router.get('/grounds/:publicGroundId/matches', requireAuth, requireGroundRole('GROUND_OWNER'), listGroundMatches)
router.post('/grounds/:publicGroundId/matches', requireAuth, requireGroundRole('GROUND_OWNER'), createGroundMatch)
router.get('/grounds/:publicGroundId/matches/:matchId/umpire-slots', requireAuth, requireGroundRole('GROUND_OWNER'), getGroundMatchUmpireSlots)
router.post('/grounds/:publicGroundId/matches/:matchId/start', requireAuth, requireGroundRole('GROUND_OWNER'), startGroundMatch)
router.post('/grounds/:publicGroundId/matches/:matchId/complete', requireAuth, requireGroundRole('GROUND_OWNER'), completeGroundMatch)

export default router
