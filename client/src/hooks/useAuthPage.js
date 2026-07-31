import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { getPostAuthPath } from '../models/roleRedirect.model.js'
import { MIN_PASSWORD_LENGTH } from '../models/auth.model.js'

export function useAuthPage() {
  const { login, signup, selectRole } = useAuth()
  const navigate = useNavigate()

  const [loginAs, setLoginAs] = useState('player')
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [staffCode, setStaffCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'signup' : 'login'))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (loginAs === 'staff' && !staffCode) {
      setError('Enter your staff access code.')
      return
    }

    setSubmitting(true)
    try {
      let user = mode === 'login' ? await login(email, password) : await signup(name, email, password)

      // First time through role hasn't been chosen yet (fresh signup, or a
      // login where role-select was never completed) — honor the tab they picked.
      if (user.role === 'user') {
        user = await selectRole(loginAs, staffCode)
      }

      navigate(getPostAuthPath(user), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    loginAs,
    setLoginAs,
    mode,
    toggleMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    staffCode,
    setStaffCode,
    error,
    submitting,
    handleSubmit,
  }
}
