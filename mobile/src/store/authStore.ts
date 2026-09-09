import { create } from 'zustand'
import type { QueryClient } from '@tanstack/react-query'
import * as authApi from '../services/authApi'
import * as playerApi from '../services/playerApi'
import * as umpireApi from '../services/umpireApi'
import api from '../services/api'
import { User, Player, MfaStatus, UmpireApproval } from '../types'

const DEFAULT_MFA: MfaStatus = { enrolled: false, required: false, verified: false }

function isUmpireAccount(user: User | null): boolean {
  return user?.role === 'player' && user?.player_type === 'umpire'
}

// Resolved before `status` flips to 'authenticated' so the root router
// never renders a Player screen for an Umpire (or vice-versa).
async function resolveUmpireApproval(user: User | null): Promise<UmpireApproval> {
  if (!isUmpireAccount(user)) return null
  try {
    const request = await umpireApi.getMyUmpireRequest()
    return request?.status ?? 'none'
  } catch {
    return 'unknown'
  }
}

// Shared by verifyOtp / loginWithPassword: resolve everything the root
// router needs, THEN flip status to 'authenticated' in one set() so the
// first authenticated render is already the right experience.
async function applyAuthenticatedUser(
  set: (partial: Partial<AuthStore>) => void,
  user: User,
): Promise<void> {
  const umpire = isUmpireAccount(user)
  const umpireApproval = await resolveUmpireApproval(user)
  let player: Player | null = null
  if (user?.role === 'player' && !umpire) {
    try {
      player = await playerApi.fetchMyPlayer()
    } catch {
      // Player profile not found yet - not an error
    }
  }
  set({ user, player, isUmpire: umpire, umpireApproval, status: 'authenticated' })
}

let queryClientInstance: QueryClient | null = null

export function initializeAuthStore(queryClient: QueryClient) {
  queryClientInstance = queryClient
}

interface AuthStore {
  user: User | null
  player: Player | null
  mfa: MfaStatus
  status: 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null

  // Umpire routing. `isUmpire` = role player + player_type umpire.
  // `umpireApproval` is null for non-umpire accounts, otherwise the latest
  // umpire request status resolved during auth ('none'/'unknown' handled).
  isUmpire: boolean
  umpireApproval: UmpireApproval
  refreshUmpireApproval: () => Promise<UmpireApproval>

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
  isUmpire: false,
  umpireApproval: null,

  refreshUmpireApproval: async () => {
    const approval = await resolveUmpireApproval(get().user)
    set({ umpireApproval: approval })
    return approval
  },

  initialize: async () => {
    try {
      const { user: fetchedUser, mfa: fetchedMfa } = await authApi.fetchMe()
      const umpire = isUmpireAccount(fetchedUser)

      // Resolve umpire approval BEFORE authenticating so the first
      // rendered screen is the correct one for this account type.
      const umpireApproval = await resolveUmpireApproval(fetchedUser)
      let fetchedPlayer: Player | null = null
      if (fetchedUser?.role === 'player' && !umpire) {
        try {
          fetchedPlayer = await playerApi.fetchMyPlayer()
        } catch {
          // Player profile not found yet - not an error
        }
      }

      set({
        user: fetchedUser,
        player: fetchedPlayer,
        mfa: fetchedMfa || DEFAULT_MFA,
        isUmpire: umpire,
        umpireApproval,
        status: 'authenticated',
      })
    } catch (error) {
      set({ status: 'unauthenticated', user: null, player: null, isUmpire: false, umpireApproval: null })
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
      await applyAuthenticatedUser(set, verifiedUser)
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
      await applyAuthenticatedUser(set, loggedInUser)
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

    // Clear all TanStack Query cache to prevent private data leakage to next user
    if (queryClientInstance) {
      queryClientInstance.clear()
    }

    set({
      user: null,
      player: null,
      mfa: DEFAULT_MFA,
      isUmpire: false,
      umpireApproval: null,
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
