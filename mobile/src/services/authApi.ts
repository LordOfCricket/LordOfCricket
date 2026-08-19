import api from './api'
import { User, AuthResponse, MfaStatus } from '../types'

export async function sendOtp(identifier: string) {
  const response = await api.post('/auth/send-otp', { identifier })
  return response.data
}

export async function verifyOtp(identifier: string, code: string): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/verify-otp', { identifier, code })
  return response.data.user
}

export async function logout() {
  const response = await api.post('/auth/logout')
  return response.data
}

export async function loginWithPassword(identifier: string, password: string): Promise<User> {
  const response = await api.post<AuthResponse>('/auth/login-password', {
    identifier,
    password,
  })
  return response.data.user
}

export async function forgotPassword(identifier: string) {
  const response = await api.post('/auth/forgot-password', { identifier })
  return response.data
}

export async function resetPassword(
  identifier: string,
  code: string,
  newPassword: string,
  confirmPassword: string
) {
  const response = await api.post('/auth/reset-password', {
    identifier,
    code,
    newPassword,
    confirmPassword,
  })
  return response.data
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  const response = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  })
  return response.data
}

export async function fetchMe(): Promise<AuthResponse> {
  const response = await api.get<AuthResponse>('/auth/me')
  return response.data
}

export async function selectRole(role: 'player' | 'staff'): Promise<User> {
  const response = await api.patch<{ user: User }>('/auth/role', { role })
  return response.data.user
}

export async function selectPlayerType(playerType: 'team_player' | 'umpire'): Promise<User> {
  const response = await api.patch<{ user: User }>('/auth/player-type', { playerType })
  return response.data.user
}
