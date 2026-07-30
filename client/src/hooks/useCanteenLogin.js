import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLE_OPTIONS } from '../models/canteenLogin.model.js'

export function useLogin() {
  const navigate = useNavigate()
  const [role, setRole] = useState('player')

  const handleContinue = () => {
    navigate(`/canteen/login/${role}`)
  }

  return {
    roles: ROLE_OPTIONS,
    role,
    setRole,
    handleContinue,
  }
}
