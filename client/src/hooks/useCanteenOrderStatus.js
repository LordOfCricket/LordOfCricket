import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  fetchActiveOrder,
  fetchOrder,
  socketUrl,
  CANTEEN_LATEST_ORDER_STORAGE_KEY,
  STATUS_STEPS,
} from '../models/canteenOrderStatus.model.js'

export function useOrderStatus() {
  const navigate = useNavigate()
  const location = useLocation()
  const storedOrder = useMemo(
    () => (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(CANTEEN_LATEST_ORDER_STORAGE_KEY) || 'null') : null),
    [],
  )
  const { orderId: stateOrderId } = location.state || {}
  const [orderId, setOrderId] = useState(stateOrderId || storedOrder?.orderId || '')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) {
      if (storedOrder?.mobile) {
        fetchActiveOrder(storedOrder.mobile)
          .then((found) => {
            if (found) {
              setOrder(found)
              setOrderId(found.id)
              localStorage.setItem(CANTEEN_LATEST_ORDER_STORAGE_KEY, JSON.stringify({ orderId: found.id, mobile: found.mobile, seatId: found.seatId }))
              return
            }
            navigate('/canteen/login')
          })
          .catch(() => navigate('/canteen/login'))
      } else {
        navigate('/canteen/login')
      }
      return
    }

    fetchOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.response?.data?.error || 'Unable to load order.'))
  }, [navigate, orderId, storedOrder])

  useEffect(() => {
    if (!orderId) return
    const socket = io(socketUrl)
    socket.emit('join-order-room', orderId)
    if (order?.mobile) {
      socket.emit('join-mobile-room', order.mobile)
    }

    const updateOrder = (updated) => {
      if (updated.id === orderId) {
        setOrder(updated)
      }
    }

    socket.on('order-status-updated', updateOrder)
    socket.on('order-completed', updateOrder)
    return () => socket.disconnect()
  }, [orderId, order?.mobile])

  const activeIndex = useMemo(() => {
    if (order?.status === 'Cancelled') return -1
    return STATUS_STEPS.findIndex((step) => step.status === (order?.status || 'Pending'))
  }, [order])

  const currentStep = activeIndex >= 0 ? STATUS_STEPS[activeIndex] : null

  return {
    order,
    error,
    steps: STATUS_STEPS,
    activeIndex,
    currentStep,
    handleBackToMenu: () => navigate('/canteen/menu', { state: { mobile: order?.mobile, seatId: order?.seatId } }),
  }
}
