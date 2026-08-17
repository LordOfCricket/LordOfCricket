import { Router } from 'express'
import healthRoutes from './health.routes.js'
import groundPhotoRoutes from './groundPhoto.routes.js'
import galleryImageRoutes from './galleryImage.routes.js'
import amenityRoutes from './amenity.routes.js'
import advertisementRoutes from './advertisement.routes.js'
import matchRoutes from './match.routes.js'
import indiaMatchRoutes from './indiaMatch.routes.js'
import partnerRoutes from './partner.routes.js'
import groundRoutes from './ground.routes.js'
import groundOwnerRequestRoutes from './groundOwnerRequest.routes.js'
import geocodeRoutes from './geocode.routes.js'
import canteenMenuRoutes, { groundScopedRouter as groundScopedCanteenMenuRoutes } from './canteenMenu.routes.js'
import canteenOrderRoutes, { groundScopedRouter as groundScopedCanteenOrderRoutes } from './canteenOrder.routes.js'
import authRoutes from './auth.routes.js'
import mfaRoutes from './mfa.routes.js'
import umpireRequestRoutes from './umpireRequest.routes.js'
import staffRoutes from './staff.routes.js'
import meRoutes from './me.routes.js'
import teamRoutes from './team.routes.js'
import { matchScoringRoutes, inningsScoringRoutes } from './scoring.routes.js'
import { playerStatsRoutes, meStatsRoutes, leaderboardRoutes } from './statistics.routes.js'
import groundBookingRoutes from './groundBooking.routes.js'
import groundOpsRoutes from './groundOps.routes.js'
import matchAvailabilityRoutes, { meAvailabilityRoutes } from './matchAvailability.routes.js'
import umpireAssignmentRoutes from './umpireAssignment.routes.js'
import matchMessageRoutes from './matchMessage.routes.js'
import { topUmpiresRoutes } from './umpireLeaderboard.routes.js'
import umpireSelfRoutes from './umpireSelf.routes.js'
import groundOwnerRoutes from './groundOwner.routes.js'
import matchFeedbackRoutes from './matchFeedback.routes.js'
import tournamentRoutes from './tournament.routes.js'
import { matchAIInsightRoutes, playerAIInsightRoutes, teamAIInsightRoutes } from './aiInsight.routes.js'
import { playerAnalyticsRoutes, teamAnalyticsRoutes, matchAnalyticsRoutes, tournamentAnalyticsRoutes } from './analytics.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/ground-photos', groundPhotoRoutes)
router.use('/gallery', galleryImageRoutes)
router.use('/amenities', amenityRoutes)
router.use('/advertisements', advertisementRoutes)
router.use('/matches', matchRoutes)
router.use('/matches', matchScoringRoutes)
router.use('/innings', inningsScoringRoutes)
router.use('/india-match', indiaMatchRoutes)
router.use('/partners', partnerRoutes)

// Phase 17 — MUST be mounted before teamRoutes: playerAnalyticsRoutes/
// teamAnalyticsRoutes register a bare `/compare` route, which would otherwise
// be silently swallowed by teamRoutes' `/:id` (Express matches mounted
// routers in `.use()` registration order, and `/:id` matches the literal
// segment "compare" just like any other id).
router.use('/players', playerAnalyticsRoutes)
router.use('/teams', teamAnalyticsRoutes)

router.use('/teams', teamRoutes)

// Phase 14 Part 1 — player match availability/RSVP.
router.use('/matches', matchAvailabilityRoutes)
router.use('/me', meAvailabilityRoutes)

// Phase 21 (U3) — umpire match-slot application/assignment.
router.use('/matches', umpireAssignmentRoutes)
// Umpire Communication & Commercial 2.0 — match-scoped messages.
router.use('/matches', matchMessageRoutes)
// Phase 21 (U4) — the umpire's own dashboard reads (available matches, my
// assignments, my profile).
router.use('/umpire', umpireSelfRoutes)
// Phase 21 (U5) — Ground Owner match management (own grounds, own matches,
// creating a match scoped to an owned ground).
router.use('/ground-owner', groundOwnerRoutes)
// Phase 22 (U6) — post-match feedback (Ground/Umpire/App), eligibility
// computed per (match, user) inside the service.
router.use('/matches', matchFeedbackRoutes)

// Phase 14 Part 3 — ground booking.
router.use('/bookings', groundBookingRoutes)

// Phase 18 — ground operations (timeline, staff dashboard, reports,
// utilization, audit log, notifications).
router.use('/ground', groundOpsRoutes)

// Phase 15 — tournament management.
router.use('/tournaments', tournamentRoutes)

// Phase 16 — AI Match/Player/Team Insight (public reads, staff regenerate).
router.use('/matches', matchAIInsightRoutes)
router.use('/players', playerAIInsightRoutes)
router.use('/teams', teamAIInsightRoutes)

// Phase 17 — match/tournament analytics. Both only add a `/:id/analytics`
// sub-path (an extra segment), so — unlike the player/team `/compare` routes
// above — mount order relative to matchRoutes/tournamentRoutes doesn't matter.
router.use('/matches', matchAnalyticsRoutes)
router.use('/tournaments', tournamentAnalyticsRoutes)

// Phase 7 — official career statistics, derived from finalized match history only.
router.use('/players', playerStatsRoutes)
router.use('/me', meStatsRoutes)
router.use('/stats', leaderboardRoutes)
// Umpire Intelligence & Scale 2.0 — deliberately a separate route, never
// merged into the player leaderboard's own :metric space.
router.use('/stats', topUmpiresRoutes)

// Site-wide auth (single login for players, staff, umpires)
router.use('/auth', authRoutes)
// Phase 6 — privileged-account MFA/WebAuthn/step-up, also under /auth.
router.use('/auth', mfaRoutes)
router.use('/umpire-requests', umpireRequestRoutes)
router.use('/staff', staffRoutes)
router.use('/me', meRoutes)

// Canteen (merged into the main LOC API, namespaced under /canteen)
// TRANSITIONAL — Phase 10/11: single-canteen-resolving, kept for the
// existing frontend (Phase 11 Step 20/30 forbids a frontend redesign this
// phase). Fails safely (409) instead of guessing if a second canteen ever
// exists (see canteen.model.js's AmbiguousCanteenError).
router.use('/canteen/menu', canteenMenuRoutes)
router.use('/canteen/orders', canteenOrderRoutes)
router.get('/canteen/health', (req, res) => {
  res.json({ ok: true, service: 'Canteen Management API' })
})

// REAL multi-ground routes (Phase 11) — the canonical architecture going
// forward: tenancy is resolved from the URL + verified in PostgreSQL, never
// guessed. Not yet used by any frontend; exists so ground/canteen tenancy
// is provably real and testable ahead of the frontend's own migration.
router.use('/grounds/:publicGroundId/canteens/:publicCanteenId/menu', groundScopedCanteenMenuRoutes)
router.use('/grounds/:publicGroundId/canteens/:publicCanteenId/orders', groundScopedCanteenOrderRoutes)

// Phase 12 — public ground discovery (GET /grounds/nearby) and public
// ground profile (GET /grounds/:publicGroundId). Mounted at the same
// '/grounds' prefix as the mounts above with no ordering conflict: Express
// strips the '/grounds' prefix and hands the remainder to whichever router
// is tried; groundRoutes only defines single-segment routes ('/nearby',
// '/:publicGroundId'), so a multi-segment path like
// '/GRD-x/canteens/CAN-y/menu' never matches here and falls through to the
// canteen-scoped mounts above, regardless of registration order.
router.use('/grounds', groundRoutes)

// Phase 4 — Ground Owner request/approval (public submission + super_admin
// review queue). Replaces the old GET/PATCH /ground-review admin queue
// (retired) — see ground.controller.js#registerGround and
// groundOwnerRequest.service.js for why: reviewing/deciding now happens
// against a ground_owner_requests row (which never grants membership on its
// own), not a DRAFT grounds row (which used to grant it immediately on
// submission, before any review — the bug this phase fixes).
router.use('/ground-owner-requests', groundOwnerRequestRoutes)

// Grounds page — landmark search (free-text -> real lat/lng via OpenStreetMap
// Nominatim, no paid geocoding service). Its own top-level route, not under
// /grounds, since it geocodes an arbitrary place name, not a ground.
router.use('/geocode', geocodeRoutes)

export default router
