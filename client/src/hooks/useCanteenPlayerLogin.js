import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  sendOtp,
  verifyOtp,
  MOBILE_REGEX,
  OTP_RESEND_COOLDOWN_SECONDS,
  CANTEEN_MOBILE_STORAGE_KEY,
} from '../models/canteenPlayerLogin.model.js'

export function usePlayerLogin() {
  const navigate = useNavigate()

  const [mobile, setMobile] = useState(
    () => localStorage.getItem(CANTEEN_MOBILE_STORAGE_KEY) || ''
  )

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [sentOtp, setSentOtp] = useState('')
  const [stage, setStage] = useState('enter-mobile')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let timer

    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    }

    return () => clearTimeout(timer)
  }, [cooldown])

  const canSendOtp = useMemo(
    () => MOBILE_REGEX.test(mobile) && cooldown === 0,
    [mobile, cooldown]
  )

  const handleSendOtp = async () => {
    setError('')
    setStatus('')

    try {
      const response = await sendOtp({ mobile })

      localStorage.setItem(CANTEEN_MOBILE_STORAGE_KEY, mobile)

      setSentOtp(response.otp || '')
      setStatus('OTP sent successfully to your mobile number.')
      setStage('enter-otp')
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send OTP.')
    }
  }

  const handleVerifyOtp = async () => {
    setError('')

    try {
      await verifyOtp({
        mobile,
        code: otp,
      })

      localStorage.setItem(CANTEEN_MOBILE_STORAGE_KEY, mobile)

      navigate('/canteen/menu', {
        state: { mobile },
      })
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed.')
    }
  }

  return {
    mobile,
    setMobile,
    otp,
    setOtp,
    error,
    status,
    sentOtp,
    stage,
    cooldown,
    canSendOtp,
    handleSendOtp,
    handleVerifyOtp,
  }
}
