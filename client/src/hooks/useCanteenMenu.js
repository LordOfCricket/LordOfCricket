import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import {
  fetchActiveOrder,
  fetchMenu,
  fetchOrder,
  fetchOrderHistory,
  placeOrder,
  defaultCart,
  socketUrl,
  activeStatuses,
  CANTEEN_LATEST_ORDER_STORAGE_KEY,
  formatOrderDate,
  computeCartTotal,
} from '../models/canteenMenu.model.js'

export function useMenu() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id

  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState(defaultCart)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState('')

  const loadPlayerOrders = async () => {
    if (!userId) return
    try {
      const [currentOrder, history] = await Promise.all([
        fetchActiveOrder(userId),
        fetchOrderHistory(userId),
      ])
      setActiveOrder(currentOrder)
      setOrderHistory(history)
    } catch (err) {
      console.error('Unable to load player orders:', err)
      setActiveOrder(null)
      setOrderHistory([])
    }
  }

  useEffect(() => {
    if (!userId) {
      navigate('/login')
      return
    }

    async function loadPage() {
      try {
        const items = await fetchMenu()
        setMenu(items)
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load menu.')
      }

      loadPlayerOrders()
    }

    loadPage()
  }, [userId, navigate])

  useEffect(() => {
    if (!userId) return

    const socket = io(socketUrl)
    let hasConnectedBefore = false

    const refreshMenu = async () => {
      const items = await fetchMenu()
      setMenu(items)
    }

    const refreshPlayerOrders = (order) => {
      if (order.userId === userId) {
        loadPlayerOrders().catch(() => {})
      }
    }

    const updatePlayerOrder = (order) => {
      if (order.userId === userId) {
        loadPlayerOrders().catch(() => {})
        setDetailsOrder((current) => (current?.id === order.id ? order : current))
      }
    }

    // Phase 13 fix — Socket.IO drops room membership on disconnect and never
    // auto-rejoins an app-level room on its own reconnect. Without re-emitting
    // 'join-user-room' here, a dropped connection silently stopped receiving
    // every canteen event forever after the first reconnect. On any reconnect
    // (not the first connect) also resync menu/orders via HTTP, since events
    // published while disconnected are gone for good otherwise.
    socket.on('connect', () => {
      socket.emit('join-user-room', userId)
      if (hasConnectedBefore) {
        refreshMenu().catch(() => {})
        loadPlayerOrders().catch(() => {})
      }
      hasConnectedBefore = true
    })

    socket.on('menu-updated', refreshMenu)
    socket.on('order-created', refreshPlayerOrders)
    socket.on('order-status-updated', updatePlayerOrder)
    socket.on('order-completed', updatePlayerOrder)

    return () => socket.disconnect()
  }, [userId])

  const addItem = (item) => {
    if (activeOrder) {
      setError('You already have an active order.')
      return
    }

    setCart((prev) => {
      const existing = prev.items.find((x) => x.id === item.id)
      const items = existing
        ? prev.items.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x))
        : [...prev.items, { ...item, foodId: item.foodId || item.id, qty: 1 }]

      return {
        items,
        total: computeCartTotal(items),
      }
    })
  }

  const removeItem = (item) => {
    setCart((prev) => {
      const items = prev.items
        .map((x) => (x.id === item.id ? { ...x, qty: Math.max(0, x.qty - 1) } : x))
        .filter((item) => item.qty > 0)

      return {
        items,
        total: computeCartTotal(items),
      }
    })
  }

  const orderCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.qty, 0),
    [cart.items],
  )

  const groupedHistory = useMemo(() => {
    return orderHistory.reduce((groups, order) => {
      const key = formatOrderDate(order.orderedAt || order.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
      return groups
    }, {})
  }, [orderHistory])

  const handlePlaceOrder = async () => {
    if (activeOrder) {
      setError('You already have an active order.')
      setConfirmOpen(false)
      return
    }

    if (!orderCount) {
      setError('Please add at least one item.')
      return
    }

    setError('')

    try {
      const order = await placeOrder({
        items: cart.items,
        total: cart.total,
      })

      localStorage.setItem(
        CANTEEN_LATEST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId: order.id,
          userId,
        }),
      )

      setActiveOrder(activeStatuses.includes(order.status) ? order : null)
      setConfirmOpen(false)
      setCart(defaultCart)

      navigate('/canteen/order-status', {
        state: {
          orderId: order.id,
        },
      })
    } catch (err) {
      if (err.response?.status === 409) {
        setActiveOrder(err.response.data.order)
        setError('You already have an active order.')
        setConfirmOpen(false)
        return
      }
      setError(err.response?.data?.error || 'Unable to place order.')
    }
  }

  const handleTrackOrder = () => {
    if (!activeOrder) return
    navigate('/canteen/order-status', {
      state: {
        orderId: activeOrder.id,
      },
    })
  }

  const handleViewDetails = async (orderId) => {
    setLoadingDetails(true)
    setError('')
    try {
      const order = await fetchOrder(orderId)
      setDetailsOrder(order)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load order details.')
    } finally {
      setLoadingDetails(false)
    }
  }

  return {
    menu,
    cart,
    confirmOpen,
    setConfirmOpen,
    activeOrder,
    orderHistory,
    showHistory,
    setShowHistory,
    detailsOrder,
    setDetailsOrder,
    loadingDetails,
    error,
    orderCount,
    groupedHistory,
    addItem,
    removeItem,
    handlePlaceOrder,
    handleTrackOrder,
    handleViewDetails,
  }
}
