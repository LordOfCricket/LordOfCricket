import api from './api'
import { User, AuthResponse, MfaStatus } from '../types'

// DEVELOPMENT-ONLY OTP BYPASS
// This should NEVER be enabled in production
// Used for testing without depending on SMS service
const DEV_OTP_CODE = '123456'
const isDevelopment = process.env.EXPO_PUBLIC_APP_ENV === 'development'

export async function sendOtp(identifier: string) {
  // DEVELOPMENT-ONLY: Skip SMS service in development
  if (isDevelopment) {
    // Simulate API response without calling real SMS provider
    return { success: true, message: 'OTP sent (development mode)' }
  }

  // PRODUCTION: Use real OTP service
  const response = await api.post('/auth/send-otp', { identifier })
  return response.data
}

export async function verifyOtp(identifier: string, code: string): Promise<User> {
  // DEVELOPMENT-ONLY: Accept dev OTP in development
  if (isDevelopment && code === DEV_OTP_CODE) {
    // For development, send the dev OTP to backend for verification
    // This allows testing the complete auth flow without depending on SMS
    try {
      const response = await api.post<AuthResponse>('/auth/verify-otp', {
        identifier,
        code: DEV_OTP_CODE,
      })
      return response.data.user
    } catch (error) {
      // If backend doesn't recognize dev OTP, re-throw error
      // The user should see this in development
      throw error
    }
  }

  // PRODUCTION: Verify real OTP only
  const response = await api.post<AuthResponse>('/auth/verify-otp', { identifier, code })
  return response.data.user
}

export function getDevOtpCode(): string | null {
  return isDevelopment ? DEV_OTP_CODE : null
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
