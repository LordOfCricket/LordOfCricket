import { useEffect, useState } from 'react'
import {
  getAllMerchandiseAdmin,
  createMerchandise,
  updateMerchandise,
  deleteMerchandise,
} from '../services/merchandise.js'

export const MERCHANDISE_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']
export const STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  OUT_OF_STOCK: 'Out of Stock',
}

const EMPTY_ADD_FORM = {
  name: '',
  description: '',
  category: '',
  originalPrice: '',
  sellingPrice: '',
  status: 'DRAFT',
  sortOrder: '',
  file: null,
}

// Mirrors the price cross-check the backend enforces, so an obvious mistake
// is caught before the request (the API is still the source of truth).
function clientValidate(form) {
  if (!form.name.trim()) return 'Product name is required.'
  const selling = Number(form.sellingPrice)
  if (!Number.isFinite(selling) || selling <= 0) return 'Selling price must be greater than 0.'
  if (form.originalPrice !== '' && form.originalPrice != null) {
    const original = Number(form.originalPrice)
    if (!Number.isFinite(original) || original <= 0) return 'Original price must be greater than 0.'
    if (selling > original) return 'Selling price cannot be greater than the original price.'
  }
  if (form.sortOrder !== '' && form.sortOrder != null) {
    const order = Number(form.sortOrder)
    if (!Number.isInteger(order) || order < 0) return 'Display order must be a non-negative whole number.'
  }
  return null
}

// Super Admin Merchandise CMS — same add / edit / delete / inline-status
// shape as useAdminSponsors, over GET|POST|PATCH|DELETE /api/merchandise.
// `getAllMerchandiseAdmin` (not the public list) so DRAFT / INACTIVE
// products stay visible here to be published.
export function useAdminMerchandise() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_ADD_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const load = () => {
    getAllMerchandiseAdmin()
      .then(setProducts)
      .catch(() => setListError('Unable to load merchandise.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (!addForm.file) return setError('A product image is required.')
    const invalid = clientValidate(addForm)
    if (invalid) return setError(invalid)

    setSubmitting(true)
    try {
      await createMerchandise({
        file: addForm.file,
        name: addForm.name.trim(),
        description: addForm.description,
        category: addForm.category,
        originalPrice: addForm.originalPrice,
        sellingPrice: addForm.sellingPrice,
        status: addForm.status,
        sortOrder: addForm.sortOrder === '' ? products.length + 1 : addForm.sortOrder,
      })
      setAddForm(EMPTY_ADD_FORM)
      e.target.reset()
      load()
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to add product.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setEditError('')
    setEditForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      originalPrice: product.originalPrice ?? '',
      sellingPrice: product.sellingPrice ?? '',
      status: product.status || 'DRAFT',
      sortOrder: product.sortOrder ?? '',
      file: null,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(EMPTY_ADD_FORM)
    setEditError('')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setEditError('')
    const invalid = clientValidate(editForm)
    if (invalid) return setEditError(invalid)

    setEditSubmitting(true)
    try {
      await updateMerchandise(editingId, {
        file: editForm.file,
        name: editForm.name.trim(),
        description: editForm.description,
        category: editForm.category,
        originalPrice: editForm.originalPrice === '' ? '' : editForm.originalPrice,
        sellingPrice: editForm.sellingPrice,
        status: editForm.status,
        sortOrder: editForm.sortOrder === '' ? 0 : editForm.sortOrder,
      })
      cancelEdit()
      load()
    } catch (err) {
      setEditError(err.response?.data?.error || err.response?.data?.message || 'Update failed.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const changeStatus = async (product, status) => {
    try {
      await updateMerchandise(product.id, { status })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status } : p)))
    } catch {
      setListError('Unable to update product status.')
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Permanently delete "${product.name}"? This cannot be undone — set the status to Inactive instead if you might want it back.`)) return
    try {
      await deleteMerchandise(product.id)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch {
      setListError('Unable to delete product.')
    }
  }

  return {
    products,
    loading,
    listError,
    addForm,
    setAddForm,
    submitting,
    error,
    handleAdd,
    editingId,
    editForm,
    setEditForm,
    editSubmitting,
    editError,
    startEdit,
    cancelEdit,
    saveEdit,
    changeStatus,
    handleDelete,
  }
}
