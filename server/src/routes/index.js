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

const router = Router()

router.use('/health', healthRoutes)
router.use('/ground-photos', groundPhotoRoutes)
router.use('/amenities', amenityRoutes)
router.use('/advertisements', advertisementRoutes)
router.use('/matches', matchRoutes)
router.use('/india-match', indiaMatchRoutes)
router.use('/partners', partnerRoutes)

// Site-wide auth (single login for players, staff, umpires)
router.use('/auth', authRoutes)
router.use('/umpire-requests', umpireRequestRoutes)

// Canteen (merged into the main LOC API, namespaced under /canteen)
router.use('/canteen/menu', canteenMenuRoutes)
router.use('/canteen/orders', canteenOrderRoutes)
router.get('/canteen/health', (req, res) => {
  res.json({ ok: true, service: 'Canteen Management API' })
})

export default router
