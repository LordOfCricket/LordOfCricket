import { useCallback, useEffect, useState } from 'react'
import * as authApi from '../services/authApi.js'
import { fetchMyPlayer, updateMyPlayer } from '../services/playerApi.js'
import { getStoredToken, setStoredToken, clearStoredToken } from '../utils/authToken.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [player, setPlayer] = useState(null)
  const [status, setStatus] = useState(() => (getStoredToken() ? 'loading' : 'unauthenticated'))

  const refreshPlayer = useCallback(async () => {
    try {
      const fetchedPlayer = await fetchMyPlayer()
      setPlayer(fetchedPlayer)
      return fetchedPlayer
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!getStoredToken()) return

    authApi
      .fetchMe()
      .then((fetchedUser) => {
        setUser(fetchedUser)
        setStatus('authenticated')
        if (fetchedUser?.role === 'player') refreshPlayer()
      })
      .catch(() => {
        clearStoredToken()
        setStatus('unauthenticated')
      })
  }, [refreshPlayer])

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await authApi.login({ email, password })
    setStoredToken(token)
    setUser(loggedInUser)
    setStatus('authenticated')
    if (loggedInUser?.role === 'player') refreshPlayer()
    return loggedInUser
  }

  const signup = async (name, email, password) => {
    const { token, user: newUser } = await authApi.signup({ name, email, password })
    setStoredToken(token)
    setUser(newUser)
    setStatus('authenticated')
    return newUser
  }

  const logout = () => {
    clearStoredToken()
    setUser(null)
    setPlayer(null)
    setStatus('unauthenticated')
  }

  const savePlayer = async (fields) => {
    const updated = await updateMyPlayer(fields)
    setPlayer(updated)
    return updated
  }

  const selectRole = async (role) => {
    const updated = await authApi.selectRole(role)
    setUser(updated)
    return updated
  }

  const selectPlayerType = async (playerType) => {
    const updated = await authApi.selectPlayerType(playerType)
    setUser(updated)
    return updated
  }

  const value = { user, player, status, login, signup, logout, selectRole, selectPlayerType, refreshPlayer, savePlayer }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
