import express from 'express'
import {
  createOrder,
  getActiveOrder,
  getOrder,
  getOrderHistory,
  listOrders,
  lookupOrderByUser,
  updateOrderStatus,
} from '../controllers/canteenOrder.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { attachCurrentCanteen, requireCanteenStaffAccess } from '../middlewares/groundAccess.js'

const router = express.Router()

// Order administration (list/lookup/get/update status) previously accepted
// ANY staff account (requireRole('staff') — including canteen_staff, unlike
// menu management). requireCanteenStaffAccess preserves that exactly via
// legacyStaffRoles: 'any', additively also accepting a real GROUND_OWNER/
// GROUND_ADMIN/CANTEEN_STAFF ground_users membership.
const orderStaffAccess = requireCanteenStaffAccess({ legacyStaffRoles: 'any', groundRoles: ['GROUND_OWNER', 'GROUND_ADMIN', 'CANTEEN_STAFF'] })

router.get('/', requireAuth, orderStaffAccess, listOrders)
router.get('/lookup', requireAuth, orderStaffAccess, lookupOrderByUser)
// Self-service reads: any authenticated user, scoped to their own userId
// (enforced in the controller, unchanged) — still needs to know WHICH
// canteen via attachCurrentCanteen (Step 11: canteen-scoped, never
// client-supplied).
router.get('/active/:userId', requireAuth, attachCurrentCanteen, getActiveOrder)
router.get('/history/:userId', requireAuth, attachCurrentCanteen, getOrderHistory)
router.post('/', requireAuth, attachCurrentCanteen, createOrder)
router.get('/:id', requireAuth, orderStaffAccess, getOrder)
router.patch('/:id/status', requireAuth, orderStaffAccess, updateOrderStatus)
export default router
