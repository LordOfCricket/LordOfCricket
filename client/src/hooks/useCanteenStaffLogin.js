import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginStaff } from '../models/canteenStaffLogin.model.js'

export function useStaffLogin() {
  const navigate = useNavigate()
  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    try {
      await loginStaff({ id: staffId, password })
      navigate('/canteen/staff')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to login.')
    }
  }

  return {
    staffId,
    setStaffId,
    password,
    setPassword,
    error,
    handleLogin,
  }
}
