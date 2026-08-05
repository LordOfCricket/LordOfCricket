import { Router } from 'express'
import { requireAuth, requireScorer } from '../middlewares/auth.js'
import { getMyAvailability, setMyAvailability, listMatchAvailability } from '../controllers/matchAvailability.controller.js'

// Mounted at /api/matches
const router = Router()
router.get('/:matchId/availability', requireAuth, requireScorer, listMatchAvailability)
export default router

// Mounted at /api/me
export const meAvailabilityRoutes = Router()
meAvailabilityRoutes.get('/availability/:matchId', requireAuth, getMyAvailability)
meAvailabilityRoutes.patch('/availability/:matchId', requireAuth, setMyAvailability)
