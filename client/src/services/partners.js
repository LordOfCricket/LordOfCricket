import api from './api.js'

export async function getPartners() {
  const { data } = await api.get('/partners')
  return data
}

export async function uploadPartner({ file, name, websiteUrl, sortOrder }) {
  const formData = new FormData()
  formData.append('logo', file)
  formData.append('name', name)
  if (websiteUrl) formData.append('websiteUrl', websiteUrl)
  if (sortOrder) formData.append('sortOrder', sortOrder)
  const { data } = await api.post('/partners/upload', formData)
  return data
}

export async function deletePartner(id) {
  const { data } = await api.delete(`/partners/${id}`)
  return data
}
