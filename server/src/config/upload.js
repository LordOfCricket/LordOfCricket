import multer from 'multer'
import { mkdirSync } from 'fs'
import { dirname, join, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsRoot = join(__dirname, '../../uploads')

export function createUploader(subdir) {
  const uploadsDir = join(uploadsRoot, subdir)
  mkdirSync(uploadsDir, { recursive: true })

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`)
    },
  })

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'))
      }
      cb(null, true)
    },
  })

  return { upload, uploadsDir }
}
