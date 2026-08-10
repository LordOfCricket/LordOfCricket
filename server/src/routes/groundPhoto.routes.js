import express from 'express'
import multer from 'multer'
import {
  listGroundPhotos,
  addGroundPhoto,
  uploadGroundPhoto,
  removeGroundPhoto,
} from '../controllers/groundPhoto.controller.js'
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

router.get('/', listGroundPhotos)
router.post('/', requireAuth, requireStaffRole('super_admin'), attachSingleGroundContext, addGroundPhoto)
router.post('/upload', requireAuth, requireStaffRole('super_admin'), attachSingleGroundContext, uploadSingleImage, uploadGroundPhoto)
router.delete('/:id', requireAuth, requireStaffRole('super_admin'), removeGroundPhoto)

export default router
