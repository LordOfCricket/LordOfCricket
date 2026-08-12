import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { getPostLoginPath } from '../models/roleRedirect.model.js'
import { MIN_PASSWORD_LENGTH } from '../models/auth.model.js'

const LOGIN_AS_VALUES = ['player', 'staff', 'umpire']

export function useAuthPage() {
  const { login, signup, selectRole, selectPlayerType } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Lets a nav link land directly on a given tab (e.g. the navbar's
  // "Umpire" button -> /login?as=umpire) without duplicating the whole
  // login form for each role. Falls back to 'player' for anything
  // unrecognized, same as the tab's own default.
  const [loginAs, setLoginAs] = useState(() => {
    const requested = searchParams.get('as')
    return LOGIN_AS_VALUES.includes(requested) ? requested : 'player'
  })
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    setSubmitting(true)
    try {
      let user = mode === 'login' ? await login(email, password) : await signup(name, email, password)

      // First time through role hasn't been chosen yet (fresh signup, or a
      // login where role-select was never completed) — honor the tab they
      // picked. 'umpire' is a player_type, not a role (selectRole only ever
      // accepts 'player' server-side) — Umpire Login means role='player' +
      // player_type='umpire', reusing the exact same two existing calls
      // PlayerTypeSelectPage's "🚩 Umpire" button already makes, just
      // chained here instead of shown as a separate step.
      if (user.role === 'user') {
        if (loginAs === 'umpire') {
          user = await selectRole('player')
          user = await selectPlayerType('umpire')
        } else {
          user = await selectRole(loginAs)
        }
      }

      // A fully set-up account lands on the homepage, not a role-specific
      // dashboard — never replaced, so Home becomes a real history entry
      // (Homepage -> Dashboard -> Back correctly returns to Homepage, not
      // skips past it). A still-incomplete account (mandatory role/
      // player-type selection) keeps the exact prior replace-redirect
      // behavior — unaffected by this change.
      const destination = getPostLoginPath(user)
      if (destination === '/') navigate('/')
      else navigate(destination, { replace: true })
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
    error,
    submitting,
    handleSubmit,
  }
}
