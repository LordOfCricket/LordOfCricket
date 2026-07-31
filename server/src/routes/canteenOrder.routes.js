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
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = express.Router()
router.get('/', requireAuth, requireRole('staff'), listOrders)
router.get('/lookup', requireAuth, requireRole('staff'), lookupOrderByUser)
router.get('/active/:userId', requireAuth, getActiveOrder)
router.get('/history/:userId', requireAuth, getOrderHistory)
router.post('/', requireAuth, createOrder)
router.get('/:id', requireAuth, requireRole('staff'), getOrder)
router.patch('/:id/status', requireAuth, requireRole('staff'), updateOrderStatus)
export default router
