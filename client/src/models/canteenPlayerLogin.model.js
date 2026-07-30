import { sendOtp, verifyOtp } from '../services/canteenApi.js'

export { sendOtp, verifyOtp }

export const MOBILE_REGEX = /^[6-9]\d{9}$/
export const OTP_RESEND_COOLDOWN_SECONDS = 30
export const CANTEEN_MOBILE_STORAGE_KEY = 'canteenMobile'
