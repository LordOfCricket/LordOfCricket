import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { connectPostgres, connectMongo } from './config/db.js'
import { allowedOrigins } from './config/corsOrigins.js'

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
  console.log('Socket connected:', socket.id)

  socket.on('join-staff-room', () => socket.join('staff'))
  socket.on('join-user-room', (userId) => {
    if (userId) socket.join(`user:${userId}`)
  })
  socket.on('join-order-room', (orderId) => {
    if (orderId) socket.join(`order:${orderId}`)
  })
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id))
})

async function start() {
  await connectPostgres()
  await connectMongo()
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`))
}

start()
