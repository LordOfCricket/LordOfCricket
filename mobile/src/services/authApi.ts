import api from './api'
import { User, AuthResponse } from '../types'

// DEVELOPMENT-ONLY OTP BYPASS
// This should NEVER be enabled in production
// Used for testing without depending on SMS service
const DEV_OTP_CODE = '123456'
const isDevelopment = process.env.EXPO_PUBLIC_APP_ENV === 'development'

// Entering the dev OTP code logs into this REAL, already-seeded account
// (server/src/scripts/seedTestingEnvironment.js's ACCOUNTS.player) via the
// existing password-login endpoint — a real signed session, a real
// users.id, and a real players row (players.user_id -> users.id). This
// replaces a previous version that fabricated an in-memory user + a fake
// client-only cookie the backend's requireAuth never recognized (its name
// didn't match the real session cookie), which made every authenticated
// endpoint 401 despite the app appearing "logged in". No new auth
// mechanism — same /auth/login-password real users hit from the password
// login screen.
const DEV_TEST_IDENTIFIER = 'loc-test-player@loctest.local'
const DEV_TEST_PASSWORD = 'LocTester#2026'

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
  // DEVELOPMENT-ONLY: Accept dev OTP in development — logs into the real
  // seeded dev/test player account instead of any identifier the user typed.
  if (isDevelopment && code === DEV_OTP_CODE) {
    return loginWithPassword(DEV_TEST_IDENTIFIER, DEV_TEST_PASSWORD)
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

export async function signupSendCode(identifier: string) {
  const response = await api.post('/auth/signup/send-code', { identifier })
  return response.data
}

export async function signupVerifyCode(identifier: string, code: string) {
  const response = await api.post('/auth/signup/verify-code', { identifier, code })
  return response.data
}

export interface SignupCreateAccountPayload {
  firstName: string
  middleName: string
  lastName: string
  accountType: 'PLAYER' | 'UMPIRE'
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export async function signupCreateAccount(payload: SignupCreateAccountPayload): Promise<User> {
  const response = await api.post<{ user: User }>('/auth/signup/create-account', payload)
  return response.data.user
}
