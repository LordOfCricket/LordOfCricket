import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { getPostAuthPath } from '../models/roleRedirect.model.js'

export function usePlayerTypeSelect() {
  const { selectPlayerType } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const choose = async (playerType) => {
    setSubmitting(true)
    setError('')
    try {
      const updated = await selectPlayerType(playerType)
      navigate(getPostAuthPath(updated), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save your choice.')
      setSubmitting(false)
    }
  }

  return { submitting, error, choose }
}
