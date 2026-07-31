import api from './api.js'

export async function signup(payload) {
  const response = await api.post('/auth/signup', payload)
  return response.data
}

export async function login(payload) {
  const response = await api.post('/auth/login', payload)
  return response.data
}

export async function fetchMe() {
  const response = await api.get('/auth/me')
  return response.data.user
}

export async function selectRole(role, staffCode) {
  const response = await api.patch('/auth/role', { role, staffCode })
  return response.data.user
}

export async function selectPlayerType(playerType) {
  const response = await api.patch('/auth/player-type', { playerType })
  return response.data.user
}
