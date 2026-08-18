import api from './api.js'

// Unified OTP login (email or phone) — the primary auth path. No token to
// manage client-side: the backend sets an HttpOnly session cookie on
// success, and the axios instance already sends it automatically
// (withCredentials: true in api.js) — nothing here reads or stores it.
export async function sendOtp(identifier) {
  const response = await api.post('/auth/send-otp', { identifier })
  return response.data
}

export async function verifyOtp(identifier, code) {
  const response = await api.post('/auth/verify-otp', { identifier, code })
  return response.data.user
}

export async function logout() {
  const response = await api.post('/auth/logout')
  return response.data
}

// Phase 4 — Player/Umpire self-registration. Both complete via the SAME
// verifyOtp above (the verified code's purpose tells the backend which kind
// of account to create) — these only request the code.
export async function registerPlayer(name, identifier) {
  const response = await api.post('/auth/register/player', { name, identifier })
  return response.data
}

export async function registerUmpire(name, identifier) {
  const response = await api.post('/auth/register/umpire', { name, identifier })
  return response.data
}

// Phase 8 — the legacy email+password `signup`/`login` wrappers were
// removed here along with the backend routes that backed them (see
// docs/AUTH.md's "Legacy JWT" section) — zero reachable UI callers existed.

// Auth Enhancement — the second credential type for the SAME unified login
// entry point above, not a second auth flow. Same no-token-to-manage shape
// as verifyOtp: the backend sets the identical HttpOnly session cookie.
export async function loginWithPassword(identifier, password) {
  const response = await api.post('/auth/login-password', { identifier, password })
  return response.data.user
}

export async function forgotPassword(identifier) {
  const response = await api.post('/auth/forgot-password', { identifier })
  return response.data
}

export async function resetPassword(identifier, code, newPassword, confirmPassword) {
  const response = await api.post('/auth/reset-password', { identifier, code, newPassword, confirmPassword })
  return response.data
}

// Phase 6 — now also returns `mfa: {enrolled, required, verified}` alongside
// the unchanged `user` shape every existing caller already relies on.
export async function fetchMe() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function selectRole(role) {
  const response = await api.patch('/auth/role', { role })
  return response.data.user
}

export async function selectPlayerType(playerType) {
  const response = await api.patch('/auth/player-type', { playerType })
  return response.data.user
}
