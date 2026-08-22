import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { requireGroundRole, requireGroundPermission, attachGroundContext } from '../middlewares/groundAccess.js'
import { bookingWriteLimiter } from '../middlewares/rateLimit.js'
import {
  getGroundAvailability,
  listGroundBookings,
  getGroundBooking,
  updateGroundBookingStatus,
  createGroundStaffBlock,
  removeGroundStaffBlock,
} from '../controllers/groundOwnerBooking.controller.js'

const router = Router({ mergeParams: true })

// Phase 6 — Ground Owner booking management. All endpoints scoped to a specific
// ground, authorized via attachGroundContext + requireGroundRole/requireGroundPermission.

// Phase 6 — Ground owner viewing availability for their ground (requires auth).
// Distinct from public /bookings/availability which requires no auth.
router.get('/availability', requireAuth, attachGroundContext, getGroundAvailability)

// Ground owner operations — reading own ground's bookings
router.get('/', requireAuth, attachGroundContext, requireGroundPermission('BOOKING_MANAGE'), listGroundBookings)
router.get('/:publicBookingId', requireAuth, attachGroundContext, requireGroundPermission('BOOKING_MANAGE'), getGroundBooking)

// Ground owner operations — managing booking status (check-in, no-show, cancel)
router.patch('/:publicBookingId/status', bookingWriteLimiter, requireAuth, attachGroundContext, requireGroundPermission('BOOKING_MANAGE'), updateGroundBookingStatus)

// Staff block management (ground owner only — never delegable)
router.post('/staff-blocks', bookingWriteLimiter, requireAuth, attachGroundContext, requireGroundRole('GROUND_OWNER'), createGroundStaffBlock)
router.delete('/staff-blocks/:publicBlockId', bookingWriteLimiter, requireAuth, attachGroundContext, requireGroundRole('GROUND_OWNER'), removeGroundStaffBlock)

export default router
