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
  markUmpireNoShow,
  getEligibleReplacements,
  assignReplacementUmpire,
  getMatchAssignmentHistory,
  getMatchIncidents,
  setGroundMatchUmpireFee,
  updateGroundMatchSlotPaymentStatus,
  getRecommendedUmpires,
  getUmpireOperationsSummary,
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

// Phase 23 — no-show / replacement / assignment history (Workstreams F/G/H).
router.post(
  '/grounds/:publicGroundId/matches/:matchId/umpire-slots/:slotId/no-show',
  requireAuth,
  requireGroundRole('GROUND_OWNER'),
  markUmpireNoShow,
)
router.get(
  '/grounds/:publicGroundId/matches/:matchId/umpire-slots/:slotId/eligible-replacements',
  requireAuth,
  requireGroundRole('GROUND_OWNER'),
  getEligibleReplacements,
)
router.post(
  '/grounds/:publicGroundId/matches/:matchId/umpire-slots/:slotId/replace',
  requireAuth,
  requireGroundRole('GROUND_OWNER'),
  assignReplacementUmpire,
)
router.get('/grounds/:publicGroundId/matches/:matchId/umpire-history', requireAuth, requireGroundRole('GROUND_OWNER'), getMatchAssignmentHistory)
// Umpire Intelligence & Scale 2.0, Workstream C — deterministic, explainable
// recommendations. Informational only; assignment still goes through the
// existing apply/replace flows above.
router.get('/grounds/:publicGroundId/matches/:matchId/recommended-umpires', requireAuth, requireGroundRole('GROUND_OWNER'), getRecommendedUmpires)
// Workstream J — ground-level umpire operations summary for the current month.
router.get('/grounds/:publicGroundId/umpire-operations-summary', requireAuth, requireGroundRole('GROUND_OWNER'), getUmpireOperationsSummary)
router.get('/grounds/:publicGroundId/matches/:matchId/incidents', requireAuth, requireGroundRole('GROUND_OWNER'), getMatchIncidents)

// Umpire Communication & Commercial 2.0 — fee + payment status.
router.patch('/grounds/:publicGroundId/matches/:matchId/umpire-fee', requireAuth, requireGroundRole('GROUND_OWNER'), setGroundMatchUmpireFee)
router.patch(
  '/grounds/:publicGroundId/matches/:matchId/umpire-slots/:slotId/payment-status',
  requireAuth,
  requireGroundRole('GROUND_OWNER'),
  updateGroundMatchSlotPaymentStatus,
)

export default router
