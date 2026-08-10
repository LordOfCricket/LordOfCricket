import express from 'express'
import multer from 'multer'
import { listMenu, listMasterMenu, getTodaysMenuConfig, updateTodaysMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/canteenMenu.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { attachCurrentCanteen, requireCanteenStaffAccess } from '../middlewares/groundAccess.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = express.Router()

// Phase 10 — public reads still need no auth (Step 16: "do not blindly
// protect public/player endpoints"), but now resolve WHICH canteen they're
// reading via attachCurrentCanteen (Step 24: single-canteen environment,
// resolved dynamically, no client-supplied id trusted).
router.get('/', attachCurrentCanteen, listMenu)
router.get('/master', attachCurrentCanteen, listMasterMenu)
router.get('/today/config', attachCurrentCanteen, getTodaysMenuConfig)

// Food/stock/price management stays admin+ only — canteen_staff may
// view/update orders (canteenOrder.routes.js) but not touch the menu
// itself (unchanged from before Phase 10). requireCanteenStaffAccess
// additively also accepts a real GROUND_OWNER/GROUND_ADMIN ground_users
// membership — see its own comment for why this is OR, not a replacement.
const menuAccess = requireCanteenStaffAccess({ legacyStaffRoles: ['super_admin', 'admin'], groundRoles: ['GROUND_OWNER', 'GROUND_ADMIN'] })
router.patch('/today', requireAuth, menuAccess, updateTodaysMenu)
router.post('/master', requireAuth, menuAccess, upload.single('imageFile'), createMenuItem)
router.patch('/master/:id', requireAuth, menuAccess, upload.single('imageFile'), updateMenuItem)
router.delete('/master/:id', requireAuth, menuAccess, deleteMenuItem)
export default router
