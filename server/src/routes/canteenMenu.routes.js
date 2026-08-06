import express from 'express'
import multer from 'multer'
import { listMenu, listMasterMenu, getTodaysMenuConfig, updateTodaysMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/canteenMenu.controller.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = express.Router()
router.get('/', listMenu)
router.get('/master', listMasterMenu)
router.get('/today/config', getTodaysMenuConfig)
// Food/stock/price management is admin+ only — canteen_staff may view/update
// orders (canteenOrder.routes.js, unchanged requireRole('staff')) but not
// touch the menu itself.
router.patch('/today', requireAuth, requireStaffRole('super_admin', 'admin'), updateTodaysMenu)
router.post('/master', requireAuth, requireStaffRole('super_admin', 'admin'), upload.single('imageFile'), createMenuItem)
router.patch('/master/:id', requireAuth, requireStaffRole('super_admin', 'admin'), upload.single('imageFile'), updateMenuItem)
router.delete('/master/:id', requireAuth, requireStaffRole('super_admin', 'admin'), deleteMenuItem)
export default router
