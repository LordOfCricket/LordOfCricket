import { Router } from 'express'
import { me, selectRole, selectPlayerType, sendOtp, verifyOtpAndLogin, logout, registerPlayer, registerUmpire } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { otpRequestLimiter, otpVerifyLimiter } from '../middlewares/rateLimit.js'

const router = Router()

// Phase 3 — unified OTP login (email or phone), the new primary auth path.
router.post('/send-otp', otpRequestLimiter, sendOtp)
router.post('/verify-otp', otpVerifyLimiter, verifyOtpAndLogin)
router.post('/logout', logout)

// Phase 4 — Player/Umpire self-registration. Both public (no auth); both
// complete via the SAME /verify-otp above, not a separate endpoint (the
// brief forbids a generic role-selection registration endpoint) — the
// verified code's `purpose` is what tells verify-otp which kind of account
// to create.
router.post('/register/player', otpRequestLimiter, registerPlayer)
router.post('/register/umpire', otpRequestLimiter, registerUmpire)

// Phase 8 — the legacy email+password `/signup`/`/login` routes were
// removed here (zero reachable frontend callers — see docs/AUTH.md).

router.get('/me', requireAuth, me)
router.patch('/role', requireAuth, selectRole)
router.patch('/player-type', requireAuth, selectPlayerType)

export default router
