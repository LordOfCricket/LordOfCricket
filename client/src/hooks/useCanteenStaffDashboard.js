import { useCallback, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import {
  fetchTodaysMenuConfig,
  fetchOrders,
  publishTodaysMenu,
  updateOrderStatus,
  fetchMasterMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  socketUrl,
  statusIndex,
  buildFoodFormData,
  emptyNewFood,
  emptyEditFood,
} from '../models/canteenDashboard.model.js'
import { fetchPendingUmpireRequests, decideUmpireRequest } from '../services/umpireApi.js'

export function useStaffDashboard() {
  const [tab, setTab] = useState('manage')
  const [orders, setOrders] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [masterItems, setMasterItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(5)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [publishStatus, setPublishStatus] = useState('')
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [umpireRequests, setUmpireRequests] = useState([])

  const loadOrders = useCallback(async (targetPage = 1) => {
    try {
      const data = await fetchOrders(targetPage, limit, 'active')
      setOrders(data.orders)
      setTotal(data.total)
      setSelectedOrder((current) => {
        if (!current) return null
        return data.orders.find((order) => order.id === current.id) || null
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load orders.')
    }
  }, [limit])

  const loadMenuConfig = useCallback(async () => {
    try {
      const config = await fetchTodaysMenuConfig()
      setTodayItems(config.items)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load menu config.')
    }
  }, [])

  const loadMaster = useCallback(async () => {
    try {
      const items = await fetchMasterMenu()
      setMasterItems(items)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load master menu.')
    }
  }, [])

  const loadUmpireRequests = useCallback(async () => {
    try {
      const requests = await fetchPendingUmpireRequests()
      setUmpireRequests(requests)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load umpire requests.')
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([loadOrders(page), loadMenuConfig(), loadMaster(), loadUmpireRequests()])
    } finally {
      setIsRefreshing(false)
    }
  }, [page, loadOrders, loadMenuConfig, loadMaster, loadUmpireRequests])

  const handleDecideUmpireRequest = async (id, status) => {
    setError('')
    try {
      await decideUmpireRequest(id, status)
      await loadUmpireRequests()
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update umpire request.')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDashboard()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [page, refreshDashboard])

  useEffect(() => {
    const socket = io(socketUrl)
    socket.emit('join-staff-room')

    socket.on('order-created', () => loadOrders(page))
    socket.on('order-status-updated', () => loadOrders(page))
    socket.on('order-completed', () => loadOrders(page))
    socket.on('menu-updated', () => loadMenuConfig())
    return () => socket.disconnect()
  }, [page, loadOrders, loadMenuConfig])

  const handleStatusUpdate = async (order, nextStatus) => {
    try {
      const updated = await updateOrderStatus(order.id, nextStatus)
      setSelectedOrder(['Completed', 'Cancelled'].includes(updated.status) ? null : updated)
      await loadOrders(page)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update order.')
    }
  }

  const handleToggleAvailability = (itemId) => {
    setTodayItems((prev) => prev.map((item) => item.id === itemId ? { ...item, available: !item.available } : item))
    setPublishStatus('')
  }

  const handleAddToToday = (masterItem) => {
    setTodayItems((prev) => {
      if (prev.find((i) => i.id === masterItem.id)) return prev
      return [...prev, { id: masterItem.id, name: masterItem.name, available: true, dailyPrice: masterItem.price || masterItem.dailyPrice || 0 }]
    })
    setPublishStatus('')
  }

  const [newFood, setNewFood] = useState(emptyNewFood)
  const [previewImage, setPreviewImage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editFood, setEditFood] = useState(emptyEditFood)
  const [editPreviewImage, setEditPreviewImage] = useState('')

  const handleCreateFood = async () => {
    setError('')
    try {
      await createMenuItem(buildFoodFormData(newFood))
      setNewFood(emptyNewFood)
      setPreviewImage('')
      await loadMaster()
      setTab('all')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create food item.')
    }
  }

  const startEditFood = (item) => {
    setEditingItem(item)
    setEditFood({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      price: item.price,
      image: item.image || '',
      imageFile: null,
    })
    setEditPreviewImage(item.image || '')
  }

  const closeEditModal = () => {
    setEditingItem(null)
    setEditFood(emptyEditFood)
    setEditPreviewImage('')
  }

  const handleUpdateFood = async () => {
    if (!editingItem) return
    setError('')
    try {
      await updateMenuItem(editFood.id, buildFoodFormData(editFood))
      await loadMaster()
      await loadMenuConfig()
      closeEditModal()
      setTab('all')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update food item.')
    }
  }

  const handleDeleteFood = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) {
      return
    }

    setError('')
    try {
      await deleteMenuItem(item.id)
      setTodayItems((prev) => prev.filter((entry) => entry.id !== item.id))
      if (editingItem?.id === item.id) {
        closeEditModal()
      }
      await loadMaster()
      await loadMenuConfig()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete food item.')
    }
  }

  const handlePublishMenu = async () => {
    setError('')
    setPublishStatus('Saving...')
    try {
      await publishTodaysMenu({ items: todayItems })
      setPublishStatus('Today’s menu saved successfully.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to publish today’s menu.')
      setPublishStatus('')
    }
  }

  const handleNewFoodImageChange = (file) => {
    setNewFood((prev) => ({ ...prev, imageFile: file }))
    if (file) {
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  const handleEditFoodImageChange = (file) => {
    setEditFood((prev) => ({ ...prev, imageFile: file }))
    if (file) {
      setEditPreviewImage(URL.createObjectURL(file))
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesSearch = !term || [order.id, order.customerName, order.seatId].some((value) => String(value || '').toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [orders, searchTerm, statusFilter])

  return {
    tab,
    setTab,
    orders,
    todayItems,
    masterItems,
    page,
    setPage,
    total,
    limit,
    selectedOrder,
    setSelectedOrder,
    publishStatus,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    isRefreshing,
    refreshDashboard,
    umpireRequests,
    handleDecideUmpireRequest,
    statusIndex,
    handleStatusUpdate,
    handleToggleAvailability,
    handleAddToToday,
    newFood,
    setNewFood,
    previewImage,
    editingItem,
    editFood,
    setEditFood,
    editPreviewImage,
    handleCreateFood,
    startEditFood,
    closeEditModal,
    handleUpdateFood,
    handleDeleteFood,
    handlePublishMenu,
    handleNewFoodImageChange,
    handleEditFoodImageChange,
    totalPages,
    filteredOrders,
  }
}
