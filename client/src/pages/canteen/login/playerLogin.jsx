import Button from '../../../components/ui/Button.jsx'
import Input from '../../../components/ui/Input.jsx'
import { usePlayerLogin } from '../../../hooks/useCanteenPlayerLogin.js'

export default function PlayerLoginPage() {
  const {
    mobile,
    setMobile,
    otp,
    setOtp,
    error,
    status,
    stage,
    cooldown,
    canSendOtp,
    handleSendOtp,
    handleVerifyOtp,
  } = usePlayerLogin()

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.72),
            rgba(2,6,23,0.72)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-8 lg:px-16">

        <div className="w-full max-w-2xl">

          <h1 className="text-6xl font-extrabold">
            <span className="text-white">
              Welcome to{' '}
            </span>

            <span className="text-green-400">
              CricVerse
            </span>
          </h1>

          <h2 className="mt-5 text-4xl font-bold text-white">
            Player Access
          </h2>

          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Enter your registered mobile number to receive a
            secure one-time verification code and access the
            CricVerse canteen.
          </p>

          <div className="mt-10 rounded-[36px] border border-white/15 bg-slate-900/35 p-10 shadow-2xl backdrop-blur-2xl">

            <div className="space-y-7">

              <Input
                label="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your 10-digit mobile number"
                maxLength={10}
              />

              {stage === 'enter-otp' && (
                <Input
                  label="Verification Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter the 6-digit OTP"
                  maxLength={6}
                />
              )}

              {status && (
                <div className="rounded-2xl border border-green-400/20 bg-green-500/10 px-5 py-4 text-green-300">
                  ✓ {status}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-rose-300">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                                <Button
                  disabled={!canSendOtp}
                  onClick={handleSendOtp}
                  className="w-full"
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Send OTP'}
                </Button>

                {stage === 'enter-otp' && (
                  <Button
                    disabled={otp.length < 6}
                    onClick={handleVerifyOtp}
                    className="w-full"
                  >
                    Verify & Continue
                  </Button>
                )}
              </div>

            </div>
          </div>

        </div>

      </section>
    </main>
  )
}
