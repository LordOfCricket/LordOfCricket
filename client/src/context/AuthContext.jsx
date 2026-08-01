import { useEffect, useState } from 'react'
import * as authApi from '../services/authApi.js'
import { getStoredToken, setStoredToken, clearStoredToken } from '../utils/authToken.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (getStoredToken() ? 'loading' : 'unauthenticated'))

  useEffect(() => {
    if (!getStoredToken()) return

    authApi
      .fetchMe()
      .then((fetchedUser) => {
        setUser(fetchedUser)
        setStatus('authenticated')
      })
      .catch(() => {
        clearStoredToken()
        setStatus('unauthenticated')
      })
  }, [])

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await authApi.login({ email, password })
    setStoredToken(token)
    setUser(loggedInUser)
    setStatus('authenticated')
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
    setStatus('unauthenticated')
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

  const value = { user, status, login, signup, logout, selectRole, selectPlayerType }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
