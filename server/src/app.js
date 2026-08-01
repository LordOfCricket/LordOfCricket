import fs from 'fs'
import express from 'express'
import cors from 'cors'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middlewares/errorHandler.js'
import { allowedOrigins } from './config/corsOrigins.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

const canteenUploadsDir = join(__dirname, '../uploads/canteen')
if (!fs.existsSync(canteenUploadsDir)) {
  fs.mkdirSync(canteenUploadsDir, { recursive: true })
}

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(join(__dirname, '../uploads')))
app.use('/uploads/canteen', express.static(canteenUploadsDir))

// Attach the shared Socket.io instance (set in server.js) to every request,
// so canteen controllers can keep using `req.io.emit(...)` unchanged.
app.use((req, res, next) => {
  req.io = req.app.locals.io
  next()
})

// Main API — LOC homepage/ground endpoints plus canteen, mounted under /api
app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

export default app
