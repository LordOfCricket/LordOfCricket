import { create } from 'zustand'
import * as authApi from '../services/authApi'
import * as playerApi from '../services/playerApi'
import api from '../services/api'
import { User, Player, MfaStatus } from '../types'

const DEFAULT_MFA: MfaStatus = { enrolled: false, required: false, verified: false }

interface AuthStore {
  user: User | null
  player: Player | null
  mfa: MfaStatus
  status: 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null

  // Auth actions
  initialize: () => Promise<void>
  requestOtp: (identifier: string) => Promise<void>
  verifyOtp: (identifier: string, code: string) => Promise<User>
  loginWithPassword: (identifier: string, password: string) => Promise<User>
  logout: () => Promise<void>
  forgotPassword: (identifier: string) => Promise<void>
  resetPassword: (identifier: string, code: string, newPassword: string, confirmPassword: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>

  // Player actions
  refreshPlayer: () => Promise<Player | null>
  selectRole: (role: 'player' | 'staff') => Promise<User>
  selectPlayerType: (playerType: 'team_player' | 'umpire') => Promise<User>
  updatePlayer: (fields: Partial<Player>) => Promise<Player>

  // MFA actions
  refreshMfaStatus: () => Promise<MfaStatus>

  // State management
  setUser: (user: User | null) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  player: null,
  mfa: DEFAULT_MFA,
  status: 'loading',
  error: null,

  initialize: async () => {
    try {
      const { user: fetchedUser, mfa: fetchedMfa } = await authApi.fetchMe()
      set({
        user: fetchedUser,
        mfa: fetchedMfa || DEFAULT_MFA,
        status: 'authenticated',
      })

      // Load player profile if role is player
      if (fetchedUser?.role === 'player') {
        try {
          const fetchedPlayer = await playerApi.fetchMyPlayer()
          set({ player: fetchedPlayer })
        } catch {
          // Player profile not found yet - not an error
        }
      }
    } catch (error) {
      set({ status: 'unauthenticated', user: null, player: null })
    }
  },

  requestOtp: async (identifier: string) => {
    try {
      set({ error: null })
      await authApi.sendOtp(identifier)
    } catch (error) {
      set({ error: 'Failed to send OTP' })
      throw error
    }
  },

  verifyOtp: async (identifier: string, code: string) => {
    try {
      set({ error: null })
      const verifiedUser = await authApi.verifyOtp(identifier, code)
      set({
        user: verifiedUser,
        status: 'authenticated',
      })

      // Load player profile if role is player
      if (verifiedUser?.role === 'player') {
        try {
          const fetchedPlayer = await playerApi.fetchMyPlayer()
          set({ player: fetchedPlayer })
        } catch {
          // Player profile not found yet - not an error
        }
      }

      // Refresh MFA status
      await get().refreshMfaStatus()

      return verifiedUser
    } catch (error) {
      set({ error: 'Failed to verify OTP' })
      throw error
    }
  },

  loginWithPassword: async (identifier: string, password: string) => {
    try {
      set({ error: null })
      const loggedInUser = await authApi.loginWithPassword(identifier, password)
      set({
        user: loggedInUser,
        status: 'authenticated',
      })

      if (loggedInUser?.role === 'player') {
        try {
          const fetchedPlayer = await playerApi.fetchMyPlayer()
          set({ player: fetchedPlayer })
        } catch {
          // Player profile not found yet
        }
      }

      await get().refreshMfaStatus()

      return loggedInUser
    } catch (error) {
      set({ error: 'Failed to login' })
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Logout anyway even if API call fails
    }
    await api.clearSession()
    set({
      user: null,
      player: null,
      mfa: DEFAULT_MFA,
      status: 'unauthenticated',
      error: null,
    })
  },

  forgotPassword: async (identifier: string) => {
    try {
      set({ error: null })
      await authApi.forgotPassword(identifier)
    } catch (error) {
      set({ error: 'Failed to initiate password reset' })
      throw error
    }
  },

  resetPassword: async (identifier: string, code: string, newPassword: string, confirmPassword: string) => {
    try {
      set({ error: null })
      await authApi.resetPassword(identifier, code, newPassword, confirmPassword)
    } catch (error) {
      set({ error: 'Failed to reset password' })
      throw error
    }
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      set({ error: null })
      const result = await authApi.changePassword(currentPassword, newPassword, confirmPassword)
      set((state) => ({
        user: state.user ? { ...state.user, force_password_change: false } : state.user,
      }))
      return result
    } catch (error) {
      set({ error: 'Failed to change password' })
      throw error
    }
  },

  refreshPlayer: async () => {
    try {
      const fetchedPlayer = await playerApi.fetchMyPlayer()
      set({ player: fetchedPlayer })
      return fetchedPlayer
    } catch {
      return null
    }
  },

  selectRole: async (role: 'player' | 'staff') => {
    try {
      set({ error: null })
      const updatedUser = await authApi.selectRole(role)
      set({ user: updatedUser })
      return updatedUser
    } catch (error) {
      set({ error: 'Failed to select role' })
      throw error
    }
  },

  selectPlayerType: async (playerType: 'team_player' | 'umpire') => {
    try {
      set({ error: null })
      const updatedUser = await authApi.selectPlayerType(playerType)
      set({ user: updatedUser })
      return updatedUser
    } catch (error) {
      set({ error: 'Failed to select player type' })
      throw error
    }
  },

  updatePlayer: async (fields: Partial<Player>) => {
    try {
      set({ error: null })
      const updatedPlayer = await playerApi.updateMyPlayer(fields)
      set({ player: updatedPlayer })
      return updatedPlayer
    } catch (error) {
      set({ error: 'Failed to update player profile' })
      throw error
    }
  },

  refreshMfaStatus: async () => {
    try {
      const { mfa: fetchedMfa } = await authApi.fetchMe()
      set({ mfa: fetchedMfa || DEFAULT_MFA })
      return fetchedMfa || DEFAULT_MFA
    } catch {
      return DEFAULT_MFA
    }
  },

  setUser: (user: User | null) => set({ user }),
  setError: (error: string | null) => set({ error }),
}))
