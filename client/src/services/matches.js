import api from './api.js'

export async function getFeaturedMatch() {
  const { data } = await api.get('/matches/featured')
  return data
}
