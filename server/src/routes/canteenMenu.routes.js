import express from 'express'
import multer from 'multer'
import { listMenu, listMasterMenu, getTodaysMenuConfig, updateTodaysMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/canteenMenu.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const upload = multer({ storage: multer.memoryStorage() })
const router = express.Router()
router.get('/', listMenu)
router.get('/master', listMasterMenu)
router.get('/today/config', getTodaysMenuConfig)
router.patch('/today', requireAuth, requireRole('staff'), updateTodaysMenu)
router.post('/master', requireAuth, requireRole('staff'), upload.single('imageFile'), createMenuItem)
router.patch('/master/:id', requireAuth, requireRole('staff'), upload.single('imageFile'), updateMenuItem)
router.delete('/master/:id', requireAuth, requireRole('staff'), deleteMenuItem)
export default router
