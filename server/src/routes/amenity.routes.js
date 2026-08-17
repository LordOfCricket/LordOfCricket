import express from 'express'
import multer from 'multer'
import {
  listAmenities,
  addAmenity,
  uploadAmenity,
  removeAmenity,
} from '../controllers/amenity.controller.js'
import { requireAuth, requireStaffRole } from '../middlewares/auth.js'
import { attachSingleGroundContext } from '../middlewares/groundAccess.js'

// Memory storage, not disk — the buffer goes straight to Cloudinary
// (uploadImageFileDetailed) and is never written to this server's
// filesystem. Same pattern as galleryImage.routes.js / canteenMenu.routes.js.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_FILE_BYTES = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WEBP images are allowed.'))
    }
    cb(null, true)
  },
})

function uploadSingleImage(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next()
    err.statusCode = 400
    if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Image must be 10MB or smaller.'
    next(err)
  })
}

const router = express.Router()

// Phase 7 — same fix as groundPhoto.routes.js: findAllAmenities has no
// ground WHERE clause and was reachable with zero authentication, leaking
// internal `id`/`cloudinary_public_id` across every ground. Its only real
// consumer is the super-admin amenities panel; the public AmenitiesGrid
// takes its data from the ground-scoped profile endpoint instead (see
// AmenitiesGrid.jsx's own comment).
router.get('/', requireAuth, requireStaffRole('super_admin'), listAmenities)
router.post('/', requireAuth, requireStaffRole('super_admin'), attachSingleGroundContext, addAmenity)
router.post('/upload', requireAuth, requireStaffRole('super_admin'), attachSingleGroundContext, uploadSingleImage, uploadAmenity)
router.delete('/:id', requireAuth, requireStaffRole('super_admin'), removeAmenity)

export default router
