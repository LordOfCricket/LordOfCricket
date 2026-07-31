import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { getPostAuthPath } from '../models/roleRedirect.model.js'

export function useRoleSelect() {
  const { user, selectRole } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showStaffCode, setShowStaffCode] = useState(false)
  const [staffCode, setStaffCode] = useState('')

  const finish = async (role, code) => {
    setSubmitting(true)
    setError('')
    try {
      const updated = await selectRole(role, code)
      navigate(getPostAuthPath(updated), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save your choice.')
      setSubmitting(false)
    }
  }

  const choosePlayer = () => finish('player')

  const chooseStaff = () => setShowStaffCode(true)

  const confirmStaffCode = (e) => {
    e.preventDefault()
    if (!staffCode) {
      setError('Enter your staff access code.')
      return
    }
    finish('staff', staffCode)
  }

  return {
    name: user?.name,
    submitting,
    error,
    showStaffCode,
    staffCode,
    setStaffCode,
    choosePlayer,
    chooseStaff,
    confirmStaffCode,
  }
}
