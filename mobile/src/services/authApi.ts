import api from './api'
import { User, AuthResponse, MfaStatus } from '../types'
import AsyncStorage from '@react-native-async-storage/async-storage'

// DEVELOPMENT-ONLY OTP BYPASS
// This should NEVER be enabled in production
// Used for testing without depending on SMS service
const DEV_OTP_CODE = '123456'
const isDevelopment = process.env.EXPO_PUBLIC_APP_ENV === 'development'
const DEV_SESSION_COOKIE = 'dev-session=test-dev-user; Path=/; HttpOnly'
const COOKIE_STORAGE_KEY = 'loc_session_cookie'

// Mock user for development mode
function createMockDevUser(identifier: string): User {
  return {
    id: 999,
    name: 'Dev Test Player',
    email: identifier.includes('@') ? identifier : 'dev@test.local',
    phone: identifier.includes('@') ? '+919999999999' : identifier,
    role: 'player',
    status: 'ACTIVE',
    force_password_change: false,
    created_at: new Date().toISOString(),
  }
}

// Set up development session in AsyncStorage
async function setDevSession(): Promise<void> {
  try {
    await AsyncStorage.setItem(COOKIE_STORAGE_KEY, DEV_SESSION_COOKIE)
  } catch (error) {
    console.warn('Failed to set development session cookie:', error)
    // Continue anyway - development mode is best-effort
  }
}

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
    // For development, create mock session without calling backend
    // This allows testing the complete auth flow locally without SMS or backend
    await setDevSession()
    // Return a valid mock user - auth store will set authenticated state
    return createMockDevUser(identifier)
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
