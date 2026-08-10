import {
  PRESET_STATUS,
  insertOrder,
  findActiveOrderByUserId,
  findOrderById,
  findLatestOrderByUserId,
  findOrderHistoryByUserId,
  listOrdersPaginated,
  updateOrderStatusByPublicId,
} from '../models/canteenOrder.model.js'

// MongoDB cleanup, Phase 5 (final feature) — Order is now unconditionally
// PostgreSQL, a hard dependency for this whole app (never "unreachable" the
// way MongoDB was). Every `isMongoReady()` gate and the `orders` in-memory
// demo-data fallback (canteenStore.model.js) that used to appear in this
// file are gone entirely — MongoDB is no longer required by any live
// canteen feature after this phase (GalleryImage/AiInsight/MenuItem/
// TodayMenu/Order are all PostgreSQL now).

function toPublicOrder(row) {
  if (!row) return null
  return {
    id: row.public_order_id,
    userId: row.user_id,
    customerName: row.customer_name,
    seatId: row.seat_id,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    orderedAt: row.ordered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
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
    // Friendly fast-path pre-check (matches the retired code's own
    // findOne-before-create shape) — the REAL guarantee is the partial
    // unique index `idx_orders_one_active_per_user`, caught below.
    const existingActive = await findActiveOrderByUserId(userId)
    if (existingActive) {
      return res.status(409).json({
        error: 'You already have an active order.',
        order: toPublicOrder(existingActive),
      })
    }

    const normalizedItems = normalizeItems(items)
    const computedTotal = Number(total) || normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0)

    let order
    try {
      order = await insertOrder({ userId, customerName, seatId: seatId || 'unknown', items: normalizedItems, total: computedTotal })
    } catch (err) {
      // Phase 14's original guarantee, now enforced by Postgres: two
      // near-simultaneous requests can both pass the pre-check above, but
      // the database rejects the second INSERT (23505 unique_violation on
      // the partial index) — this is not a fallback path, it's the source
      // of correctness, exactly as it was with MongoDB's E11000.
      if (err.code === '23505') {
        const stillActive = await findActiveOrderByUserId(userId)
        return res.status(409).json({
          error: 'You already have an active order.',
          order: toPublicOrder(stillActive),
        })
      }
      throw err
    }

    const responseOrder = toPublicOrder(order)
    emitToOrderRooms(req.io, 'order-created', responseOrder)
    return res.json({ order: responseOrder })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function listOrders(req, res) {
  try {
    const activeOnly = req.query.status === 'active'
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))

    const { total, orders: orderRows } = await listOrdersPaginated({ activeOnly, page, limit })
    return res.json({ page, limit, total, orders: orderRows.map(toPublicOrder) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export async function getOrder(req, res) {
  try {
    const order = await findOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }
    return res.json({ order: toPublicOrder(order) })
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
    const order = await findLatestOrderByUserId(userId)
    return res.json({ order: toPublicOrder(order) })
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
    const order = await findActiveOrderByUserId(userId)
    return res.json({ order: toPublicOrder(order) })
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
    const history = await findOrderHistoryByUserId(userId)
    return res.json({ orders: history.map(toPublicOrder) })
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

    const order = await updateOrderStatusByPublicId(req.params.id, status)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    const responseOrder = toPublicOrder(order)
    emitToOrderRooms(req.io, 'order-status-updated', responseOrder)
    if (responseOrder.status === 'Completed') {
      emitToOrderRooms(req.io, 'order-completed', responseOrder)
    }
    return res.json({ order: responseOrder })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
