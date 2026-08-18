import { Link } from 'react-router-dom'
import { PlusCircle, Search, ArrowRight } from 'lucide-react'
import Navbar from '../../components/home/Navbar.jsx'
import BackgroundSystem from '../../components/home/background/BackgroundSystem.jsx'
import CursorGlow from '../../components/home/interactions/CursorGlow.jsx'
import { MouseParallaxProvider } from '../../context/MouseParallaxContext.jsx'
import BackButton from '../../components/common/BackButton.jsx'

// §1 — the "Register Your Ground" CTA (FinalCtaSection.jsx) now lands here
// first, not directly on the form: a simple choice between starting a new
// registration and checking an existing one's status.
export default function RegisterGroundEntryPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-loc-dark">
      <MouseParallaxProvider>
        <BackgroundSystem />
        <CursorGlow />
        <Navbar />
      </MouseParallaxProvider>

      <main className="relative mx-auto flex max-w-3xl flex-col gap-8 px-6 pt-32 pb-20 lg:px-10">
        <BackButton label="Back to LOC" fallback="/" className="w-fit" />

        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Register Your Ground</span>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">List your ground on LordOfCricket</h1>
          <p className="mt-3 text-emerald-100/60">List your cricket ground on LordOfCricket and make it discoverable to players and cricket communities.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            to="/register-ground/new"
            className="group flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-white/5 p-7 text-left transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/10"
          >
            <PlusCircle className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-white">New Registration</h2>
            <p className="text-sm text-emerald-100/60">Register a new cricket ground on LOC.</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
              New Registration <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/register-ground/check"
            className="group flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-white/5 p-7 text-left transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/10"
          >
            <Search className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-white">Check Registration Status</h2>
            <p className="text-sm text-emerald-100/60">Already submitted a ground? Check your registration status.</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
              Check Registration Status <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </main>
    </div>
  )
}
