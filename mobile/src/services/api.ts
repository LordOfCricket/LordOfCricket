import axios, { AxiosInstance, AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
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
        const cookieHeader = await AsyncStorage.getItem(COOKIE_STORAGE_KEY)
        if (cookieHeader) {
          config.headers.Cookie = cookieHeader
          // TEMPORARY DEBUG
          if (config.url?.includes('/matches/home')) {
            console.log('[LOC HOME AUTH]')
            console.log('AUTH TOKEN PRESENT: true')
          }
        } else {
          // TEMPORARY DEBUG
          if (config.url?.includes('/matches/home')) {
            console.log('[LOC HOME AUTH]')
            console.log('AUTH TOKEN PRESENT: false')
          }
        }
      } catch (error) {
        // Silent fail - cookie not available yet
        if (config.url?.includes('/matches/home')) {
          console.log('[LOC HOME AUTH]')
          console.log('AUTH TOKEN PRESENT: false (error retrieving)')
        }
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
          if (sessionCookie) {
            try {
              await AsyncStorage.setItem(COOKIE_STORAGE_KEY, sessionCookie)
            } catch (error) {
              // Silent fail - continue without persisting cookie
            }
          }
        }
        return response
      },
      (error: AxiosError) => {
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Unauthorized - clear stored session
          AsyncStorage.removeItem(COOKIE_STORAGE_KEY).catch(() => {
            // Silent fail - session cleanup
          })
        }
        return Promise.reject(error)
      }
    )
  }

  async clearSession() {
    try {
      await AsyncStorage.removeItem(COOKIE_STORAGE_KEY)
    } catch (error) {
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
