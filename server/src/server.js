import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { connectPostgres, connectMongo } from './config/db.js'
import { allowedOrigins } from './config/corsOrigins.js'
import { registerCricketRealtime } from './realtime/cricketRealtime.js'
import { registerBookingRealtime } from './realtime/bookingRealtime.js'
import { validateEnv } from './config/validateEnv.js'
import { logger } from './utils/logger.js'

// ES module imports (including app.js's own chain, which is where
// utils/jwt.js's JWT_SECRET check lives) are always fully evaluated before
// any of this file's own inline code runs — so this can only run after
// that check, not before it. That's fine: both checks fail fast with a
// clear message either way, this one just covers the variables nothing
// upstream was already checking (PG_*, CLIENT_ORIGIN).
validateEnv()

// A bug that escapes every try/catch and domain-error path (a genuine
// programming error, not a normal request failure — those already go
// through middlewares/errorHandler.js) should never fail silently. Log it
// with full detail server-side, then exit — process managers (pm2/systemd/
// Docker restart policy) are responsible for bringing the process back up
// into a known-good state, which is safer than continuing with whatever
// left the process in this state.
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting', { error: err.message, stack: err.stack })
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : undefined })
})

const PORT = process.env.PORT || 5000

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH'],
  },
})

// Make io available to every request as req.io (see app.js middleware)
app.locals.io = io

io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id })

  socket.on('join-staff-room', () => socket.join('staff'))
  socket.on('join-user-room', (userId) => {
    if (userId) socket.join(`user:${userId}`)
  })
  socket.on('join-order-room', (orderId) => {
    if (orderId) socket.join(`order:${orderId}`)
  })
  socket.on('disconnect', () => logger.info('Socket disconnected', { socketId: socket.id }))
})

// Phase 11 — cricket realtime (spectator match rooms). A second, additive
// connection listener on the SAME io/http server — canteen's handlers above
// are untouched. See server/src/realtime/cricketRealtime.js.
registerCricketRealtime(io)

// Phase 14 Part 3 — ground booking availability refresh rooms. Same additive
// pattern as cricket realtime above. See server/src/realtime/bookingRealtime.js.
registerBookingRealtime(io)

async function start() {
  await connectPostgres()
  await connectMongo()
  server.listen(PORT, () => logger.info(`Server listening on port ${PORT}`))
}

start()
