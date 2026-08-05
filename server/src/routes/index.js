import { Router } from 'express'
import healthRoutes from './health.routes.js'
import groundPhotoRoutes from './groundPhoto.routes.js'
import amenityRoutes from './amenity.routes.js'
import advertisementRoutes from './advertisement.routes.js'
import matchRoutes from './match.routes.js'
import indiaMatchRoutes from './indiaMatch.routes.js'
import partnerRoutes from './partner.routes.js'
import canteenMenuRoutes from './canteenMenu.routes.js'
import canteenOrderRoutes from './canteenOrder.routes.js'
import authRoutes from './auth.routes.js'
import umpireRequestRoutes from './umpireRequest.routes.js'
import meRoutes from './me.routes.js'
import teamRoutes from './team.routes.js'
import { matchScoringRoutes, inningsScoringRoutes } from './scoring.routes.js'
import { playerStatsRoutes, meStatsRoutes, leaderboardRoutes } from './statistics.routes.js'
import groundBookingRoutes from './groundBooking.routes.js'
import matchAvailabilityRoutes, { meAvailabilityRoutes } from './matchAvailability.routes.js'
import tournamentRoutes from './tournament.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/ground-photos', groundPhotoRoutes)
router.use('/amenities', amenityRoutes)
router.use('/advertisements', advertisementRoutes)
router.use('/matches', matchRoutes)
router.use('/matches', matchScoringRoutes)
router.use('/innings', inningsScoringRoutes)
router.use('/india-match', indiaMatchRoutes)
router.use('/partners', partnerRoutes)
router.use('/teams', teamRoutes)

// Phase 14 Part 1 — player match availability/RSVP.
router.use('/matches', matchAvailabilityRoutes)
router.use('/me', meAvailabilityRoutes)

// Phase 14 Part 3 — ground booking.
router.use('/bookings', groundBookingRoutes)

// Phase 15 — tournament management.
router.use('/tournaments', tournamentRoutes)

// Phase 7 — official career statistics, derived from finalized match history only.
router.use('/players', playerStatsRoutes)
router.use('/me', meStatsRoutes)
router.use('/stats', leaderboardRoutes)

// Site-wide auth (single login for players, staff, umpires)
router.use('/auth', authRoutes)
router.use('/umpire-requests', umpireRequestRoutes)
router.use('/me', meRoutes)

// Canteen (merged into the main LOC API, namespaced under /canteen)
router.use('/canteen/menu', canteenMenuRoutes)
router.use('/canteen/orders', canteenOrderRoutes)
router.get('/canteen/health', (req, res) => {
  res.json({ ok: true, service: 'Canteen Management API' })
})

export default router
