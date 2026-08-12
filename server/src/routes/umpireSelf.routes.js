import { Router } from 'express'
import { requireAuth, requireApprovedUmpire } from '../middlewares/auth.js'
import { listAvailableMatches, listMyAssignments, getMyProfile, updateMyProfile } from '../controllers/umpireSelf.controller.js'
import { listNearbyGroundsForUmpire, listGroundsByCityForUmpire } from '../controllers/umpireGroundDiscovery.controller.js'

// Mounted at /api/umpire. U4's 3 read endpoints U3 deliberately deferred
// (Phase 0's illustrative /api/umpire/matches/available, /api/umpire/
// assignments), plus a minimal profile write (the availability toggle).
// requireApprovedUmpire, not requireScorer — these are "my own umpire data"
// reads, not scoring-capability routes.
const router = Router()
router.get('/matches/available', requireAuth, requireApprovedUmpire, listAvailableMatches)
router.get('/assignments', requireAuth, requireApprovedUmpire, listMyAssignments)
router.get('/profile', requireAuth, requireApprovedUmpire, getMyProfile)
router.patch('/profile', requireAuth, requireApprovedUmpire, updateMyProfile)

// Ground-wise discovery — one large ground card per nearby/city ground,
// each carrying its own upcoming matches + real umpire-slot status, so
// the frontend can show "Interested for Umpiring" per match without a
// second per-ground round trip.
router.get('/grounds/nearby', requireAuth, requireApprovedUmpire, listNearbyGroundsForUmpire)
router.get('/grounds/by-city', requireAuth, requireApprovedUmpire, listGroundsByCityForUmpire)

export default router
