import api from './api.js'

// Public — only homepage-visible products (ACTIVE / OUT_OF_STOCK).
// Used by MerchandiseSection.jsx (homepage) and MerchandiseDetailPage.jsx.
export async function getMerchandise() {
  const { data } = await api.get('/merchandise')
  return data.items
}

export async function getMerchandiseItem(id) {
  const { data } = await api.get(`/merchandise/${id}`)
  return data
}

// Admin — every product, any status (Merchandise management page).
export async function getAllMerchandiseAdmin() {
  const { data } = await api.get('/merchandise/admin')
  return data.items
}

export async function getMerchandiseAdminItem(id) {
  const { data } = await api.get(`/merchandise/admin/${id}`)
  return data
}

// multipart — `image` file is required on create.
export async function createMerchandise({ file, name, description, category, originalPrice, sellingPrice, status, sortOrder }) {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('name', name)
  formData.append('sellingPrice', sellingPrice)
  if (description !== undefined) formData.append('description', description)
  if (category !== undefined) formData.append('category', category)
  if (originalPrice !== undefined && originalPrice !== '') formData.append('originalPrice', originalPrice)
  if (status !== undefined) formData.append('status', status)
  if (sortOrder !== undefined && sortOrder !== '') formData.append('sortOrder', sortOrder)
  const { data } = await api.post('/merchandise', formData)
  return data
}

// multipart — every field optional; pass `file` only to replace the image.
export async function updateMerchandise(id, { file, name, description, category, originalPrice, sellingPrice, status, sortOrder } = {}) {
  const formData = new FormData()
  if (file) formData.append('image', file)
  if (name !== undefined) formData.append('name', name)
  if (description !== undefined) formData.append('description', description)
  if (category !== undefined) formData.append('category', category)
  if (originalPrice !== undefined) formData.append('originalPrice', originalPrice)
  if (sellingPrice !== undefined) formData.append('sellingPrice', sellingPrice)
  if (status !== undefined) formData.append('status', status)
  if (sortOrder !== undefined) formData.append('sortOrder', sortOrder)
  const { data } = await api.patch(`/merchandise/${id}`, formData)
  return data
}

export async function deleteMerchandise(id) {
  const { data } = await api.delete(`/merchandise/${id}`)
  return data
}
