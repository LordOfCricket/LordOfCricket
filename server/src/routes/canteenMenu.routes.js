import express from 'express'
import multer from 'multer'
import { listMenu, listMasterMenu, getTodaysMenuConfig, updateTodaysMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/canteenMenu.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { attachCurrentCanteen, requireCanteenStaffAccess, attachGroundCanteenContext, requireGroundCanteenRole } from '../middlewares/groundAccess.js'

const upload = multer({ storage: multer.memoryStorage() })

// Phase 11 — ONE route table, reused for both URL schemes (Step 2/13: never
// duplicate this logic). `attachContext` resolves req.canteen with no auth;
// `staffAccess` is the OR-composed (legacy staff OR ground_users
// membership) admin gate — see groundAccess.js. Controllers only ever read
// req.canteen.id, so they're identical either way.
function buildCanteenMenuRouter({ attachContext, staffAccess }) {
  const router = express.Router({ mergeParams: true })

  // Public reads still need no auth (Step 16 predecessor: "do not blindly
  // protect public/player endpoints").
  router.get('/', attachContext, listMenu)
  router.get('/master', attachContext, listMasterMenu)
  router.get('/today/config', attachContext, getTodaysMenuConfig)

  // Food/stock/price management stays admin+ only — canteen_staff may
  // view/update orders but not touch the menu itself (unchanged since
  // before Phase 10).
  const menuAccess = staffAccess({ legacyStaffRoles: ['super_admin', 'admin'], groundRoles: ['GROUND_OWNER', 'GROUND_ADMIN'] })
  router.patch('/today', requireAuth, menuAccess, updateTodaysMenu)
  router.post('/master', requireAuth, menuAccess, upload.single('imageFile'), createMenuItem)
  router.patch('/master/:id', requireAuth, menuAccess, upload.single('imageFile'), updateMenuItem)
  router.delete('/master/:id', requireAuth, menuAccess, deleteMenuItem)
  return router
}

// TRANSITIONAL — /api/canteen/menu (Phase 10). Resolves "the" canteen via
// the fail-safe single-canteen lookup (Phase 11 hardened it to throw
// AmbiguousCanteenError instead of guessing once a second canteen exists).
// Kept for the existing frontend — Phase 11 Step 20/30 forbids a frontend
// redesign this phase.
const transitionalRouter = buildCanteenMenuRouter({
  attachContext: attachCurrentCanteen,
  staffAccess: requireCanteenStaffAccess,
})

// REAL multi-ground router — /grounds/:publicGroundId/canteens/:publicCanteenId/menu
// (Phase 11). Mounted with { mergeParams: true } so :publicGroundId/
// :publicCanteenId from the parent mount reach attachGroundCanteenContext.
export const groundScopedRouter = buildCanteenMenuRouter({
  attachContext: attachGroundCanteenContext,
  staffAccess: requireGroundCanteenRole,
})

export default transitionalRouter
