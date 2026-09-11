import axios, { AxiosInstance, AxiosError } from 'axios'
import { getSessionCookie, setSessionCookie, deleteSessionCookie } from './sessionStorage'

// Environment-aware API base URL.
// - Development build (EXPO_PUBLIC_APP_ENV === 'development'): fall back to a
//   local dev server when EXPO_PUBLIC_API_URL is not set.
// - Any other build: EXPO_PUBLIC_API_URL is REQUIRED and must be https://.
//   A missing or non-https value throws at startup instead of silently
//   pointing a production app at localhost.
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV
const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL
const DEV_FALLBACK_API_URL = 'http://localhost:3000/api'
const isDevelopmentBuild = APP_ENV === 'development'

function resolveApiUrl(): string {
  if (CONFIGURED_API_URL) {
    if (!isDevelopmentBuild && !CONFIGURED_API_URL.startsWith('https://')) {
      throw new Error(
        '[LOC] EXPO_PUBLIC_API_URL must be an https:// URL in non-development builds'
      )
    }
    return CONFIGURED_API_URL
  }
  if (isDevelopmentBuild) return DEV_FALLBACK_API_URL
  throw new Error('[LOC] EXPO_PUBLIC_API_URL is required for non-development builds')
}

export const API_URL = resolveApiUrl()
const COOKIE_STORAGE_KEY = 'loc_session_cookie'

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor: add session cookie if available
    this.instance.interceptors.request.use(async (config) => {
      try {
        const cookieHeader = await getSessionCookie(COOKIE_STORAGE_KEY)
        if (cookieHeader) {
          config.headers.Cookie = cookieHeader
        }
      } catch {
        // Silent fail - cookie not available yet
      }
      return config
    })

    // Response interceptor: handle errors and store cookies
    this.instance.interceptors.response.use(
      async (response) => {
        // Store Set-Cookie headers for future requests
        const setCookie = response.headers['set-cookie']
        if (setCookie) {
          const cookieValue = Array.isArray(setCookie) ? setCookie[0] : setCookie
          // Extract the session cookie (before semicolon)
          const sessionCookie = cookieValue.split(';')[0]
          const [, cookieVal = ''] = sessionCookie.split('=')
          if (cookieVal) {
            try {
              await setSessionCookie(COOKIE_STORAGE_KEY, sessionCookie)
            } catch {
              // Silent fail - continue without persisting cookie
            }
          } else {
            // A cleared cookie (`loc_session=; Expires=1970` from /auth/logout)
            // must not be persisted as a live session.
            try {
              await deleteSessionCookie(COOKIE_STORAGE_KEY)
            } catch {
              // Silent fail
            }
          }
        }
        return response
      },
      (error: AxiosError) => {
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Unauthorized - clear stored session
          deleteSessionCookie(COOKIE_STORAGE_KEY).catch(() => {
            // Silent fail - session cleanup
          })
        }
        return Promise.reject(error)
      }
    )
  }

  async clearSession() {
    try {
      await deleteSessionCookie(COOKIE_STORAGE_KEY)
    } catch {
      // Silent fail - logout proceeding anyway
    }
  }

  get<T = any>(url: string, config = {}) {
    return this.instance.get<T>(url, config)
  }

  post<T = any>(url: string, data?: any, config = {}) {
    return this.instance.post<T>(url, data, config)
  }

  patch<T = any>(url: string, data?: any, config = {}) {
    return this.instance.patch<T>(url, data, config)
  }

  put<T = any>(url: string, data?: any, config = {}) {
    return this.instance.put<T>(url, data, config)
  }

  delete<T = any>(url: string, config = {}) {
    return this.instance.delete<T>(url, config)
  }
}

export const apiClient = new ApiClient()
export default apiClient
