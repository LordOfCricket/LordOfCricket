import { orders } from '../models/canteenStore.model.js'
import Order from '../models/canteenOrder.model.js'
import { isMongoReady } from '../config/db.js'

const PRESET_STATUS = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled']
const LEGACY_STATUS_MAP = {
  'Order Placed': 'Pending',
  Prepared: 'Ready',
  'Ready for Pickup': 'Ready',
}
const ACTIVE_STATUSES = ['Pending', 'Accepted', 'Preparing', 'Ready', 'Prepared', 'Ready for Pickup', 'Order Placed']
const FINISHED_STATUSES = ['Completed', 'Cancelled']

function getOrderById(id) {
  return orders.find((order) => order.id === id)
}

function normalizeOrder(order) {
  if (!order) return null
  const plain = typeof order.toObject === 'function' ? order.toObject() : order
  const status = LEGACY_STATUS_MAP[plain.status] || plain.status
  const orderedAt = plain.orderedAt || plain.createdAt
  return {
    ...plain,
    id: plain.id || plain._id?.toString(),
    status,
    orderedAt,
    createdAt: plain.createdAt,
    completedAt: plain.completedAt || null,
  }
}

function normalizeItems(items) {
  return items.map((item) => ({
    id: item.id || item.foodId,
    foodId: item.foodId || item.id,
    name: item.name,
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
  }))
}

function findActiveFallback(userId) {
  return orders.find((order) => order.userId === userId && ACTIVE_STATUSES.includes(order.status))
}

function emitToOrderRooms(io, eventName, order) {
  if (!io || !order) return

  const aliases = {
    'order-created': 'order.created',
    'order-status-updated': 'order.status.updated',
    'order-completed': 'order.completed',
  }
  const rooms = ['staff']

  if (order.id) {
    rooms.push(`order:${order.id}`)
  }

  if (order.userId) {
    rooms.push(`user:${order.userId}`)
  }

  io.to(rooms).emit(eventName, order)
  if (aliases[eventName]) {
    io.to(rooms).emit(aliases[eventName], order)
  }
}

export async function createOrder(req, res) {
  const { seatId, items, total } = req.body
  const userId = req.user.id
  const customerName = req.user.name

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order payload is invalid.' })
  }

  try {
    if (isMongoReady()) {
      const activeOrder = await Order.findOne({ userId, status: { $in: ACTIVE_STATUSES } }).sort({ orderedAt: -1, createdAt: -1 })
      if (activeOrder) {
        return res.status(409).json({
          error: 'You already have an active order.',
          order: normalizeOrder(activeOrder),
        })
      }
    } else {
      const activeOrder = findActiveFallback(userId)
      if (activeOrder) {
        return res.status(409).json({
          error: 'You already have an active order.',
          order: normalizeOrder(activeOrder),
        })
      }
    }

    const orderId = `ORD-${Date.now()}`
    const orderedAt = new Date()
    const normalizedItems = normalizeItems(items)
    const orderPayload = {
      id: orderId,
      userId,
      customerName,
      seatId: seatId || 'unknown',
      items: normalizedItems,
      total: Number(total) || normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: PRESET_STATUS[0],
      orderedAt: orderedAt.toISOString(),
      createdAt: orderedAt.toISOString(),
      completedAt: null,
    }

    if (isMongoReady()) {
      let order
      try {
        order = await Order.create({
          userId,
          customerName,
          seatId: seatId || 'unknown',
          items: normalizedItems,
          total: orderPayload.total,
          status: PRESET_STATUS[0],
          orderedAt,
          hasActiveOrderFlag: true,
        })
      } catch (err) {
        // Phase 14 — the partial unique index on { userId, hasActiveOrderFlag }
        // is the real concurrency guarantee: two near-simultaneous requests can
        // both pass the findOne check above, but MongoDB rejects the second
        // insert here (E11000). This is not a fallback path, it's the source
        // of correctness — the findOne check above is only a friendly fast path.
        if (err.code === 11000) {
          const activeOrder = await Order.findOne({ userId, hasActiveOrderFlag: true })
          return res.status(409).json({
            error: 'You already have an active order.',
            order: normalizeOrder(activeOrder),
          })
        }
        throw err
      }
      const responseOrder = normalizeOrder(order)
      emitToOrderRooms(req.io, 'order-created', responseOrder)
      return res.json({ order: responseOrder })
    }

    orders.unshift(orderPayload)
    emitToOrderRooms(req.io, 'order-created', orderPayload)
    return res.json({ order: orderPayload })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function listOrders(req, res) {
  try {
    const activeOnly = req.query.status === 'active'

    if (isMongoReady()) {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))
      const skip = (page - 1) * limit
      const filter = activeOnly ? { status: { $in: ACTIVE_STATUSES } } : {}
      const [ordersList, total] = await Promise.all([
        Order.find(filter).sort({ orderedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Order.countDocuments(filter),
      ])

      return res.json({ page, limit, total, orders: ordersList.map(normalizeOrder) })
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))
    const start = (page - 1) * limit
    const filteredOrders = activeOnly
      ? orders.filter((order) => ACTIVE_STATUSES.includes(order.status))
      : orders
    const pageOrders = filteredOrders.slice(start, start + limit)

    return res.json({
      page,
      limit,
      total: filteredOrders.length,
      orders: pageOrders,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getOrder(req, res) {
  try {
    if (isMongoReady()) {
      const order = await Order.findById(req.params.id).lean()
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' })
      }
      return res.json({ order: normalizeOrder(order) })
    }

    const order = getOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }
    return res.json({ order })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function lookupOrderByUser(req, res) {
  try {
    const userId = Number(req.query.userId)
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    if (isMongoReady()) {
      const order = await Order.findOne({ userId }).sort({ createdAt: -1 }).lean()
      return res.json({ order: normalizeOrder(order) })
    }

    const order = orders.slice().reverse().find((orderItem) => orderItem.userId === userId)
    return res.json({ order: normalizeOrder(order) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getActiveOrder(req, res) {
  try {
    const userId = Number(req.params.userId)
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }
    if (req.user.id !== userId && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'You can only view your own orders.' })
    }

    if (isMongoReady()) {
      const order = await Order.findOne({ userId, status: { $in: ACTIVE_STATUSES } }).sort({ orderedAt: -1, createdAt: -1 }).lean()
      return res.json({ order: normalizeOrder(order) })
    }

    return res.json({ order: normalizeOrder(findActiveFallback(userId)) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getOrderHistory(req, res) {
  try {
    const userId = Number(req.params.userId)
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }
    if (req.user.id !== userId && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'You can only view your own orders.' })
    }

    if (isMongoReady()) {
      const history = await Order.find({ userId }).sort({ orderedAt: -1, createdAt: -1 }).lean()
      return res.json({ orders: history.map(normalizeOrder) })
    }

    const history = orders
      .filter((order) => order.userId === userId)
      .sort((a, b) => new Date(b.orderedAt || b.createdAt) - new Date(a.orderedAt || a.createdAt))

    return res.json({ orders: history.map(normalizeOrder) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body
    if (!status || !PRESET_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' })
    }

    if (isMongoReady()) {
      const order = await Order.findById(req.params.id)
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' })
      }

      order.status = status
      order.completedAt = FINISHED_STATUSES.includes(status) ? new Date() : null
      await order.save()
      if (FINISHED_STATUSES.includes(status)) {
        // Mongoose does not reliably translate `doc.field = undefined` into a
        // real MongoDB $unset on save() — do it explicitly so the partial
        // unique index genuinely stops applying to this now-terminal order.
        await Order.updateOne({ _id: order._id }, { $unset: { hasActiveOrderFlag: 1 } })
        order.hasActiveOrderFlag = undefined
      }
      const responseOrder = normalizeOrder(order)
      emitToOrderRooms(req.io, 'order-status-updated', responseOrder)
      if (responseOrder.status === 'Completed') {
        emitToOrderRooms(req.io, 'order-completed', responseOrder)
      }
      return res.json({ order: responseOrder })
    }

    const order = getOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    order.status = status
    order.completedAt = FINISHED_STATUSES.includes(status) ? new Date().toISOString() : null
    const responseOrder = normalizeOrder(order)
    emitToOrderRooms(req.io, 'order-status-updated', responseOrder)
    if (responseOrder.status === 'Completed') {
      emitToOrderRooms(req.io, 'order-completed', responseOrder)
    }
    return res.json({ order: responseOrder })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
