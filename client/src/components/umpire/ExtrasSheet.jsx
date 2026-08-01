import { useState } from 'react'

const WIDE_OPTIONS = [0, 1, 2, 3, 4]
const NO_BALL_OPTIONS = [0, 1, 2, 3, 4, 6]
const BYE_OPTIONS = [1, 2, 3, 4]

function ExtraButton({ label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-lg border text-xs font-semibold uppercase tracking-wide transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-200/80'
      }`}
    >
      {label}
    </button>
  )
}

function SubButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-lg border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white transition-all hover:bg-white/15 active:scale-95"
    >
      {label}
    </button>
  )
}

export default function ExtrasSheet({ disabled, onWide, onNoBall, onBye, onLegBye }) {
  const [active, setActive] = useState(null)
  const toggle = (key) => setActive((prev) => (prev === key ? null : key))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="grid grid-cols-4 gap-1.5">
        <ExtraButton label="Wide" active={active === 'wide'} disabled={disabled} onClick={() => toggle('wide')} />
        <ExtraButton label="No Ball" active={active === 'no-ball'} disabled={disabled} onClick={() => toggle('no-ball')} />
        <ExtraButton label="Bye" active={active === 'bye'} disabled={disabled} onClick={() => toggle('bye')} />
        <ExtraButton label="Leg Bye" active={active === 'leg-bye'} disabled={disabled} onClick={() => toggle('leg-bye')} />
      </div>

      {active && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
          {active === 'wide' &&
            WIDE_OPTIONS.map((n) => (
              <SubButton key={n} label={n === 0 ? 'Wide' : `Wide +${n}`} onClick={() => { onWide(n); setActive(null) }} />
            ))}
          {active === 'no-ball' &&
            NO_BALL_OPTIONS.map((n) => <SubButton key={n} label={`No Ball +${n}`} onClick={() => { onNoBall(n); setActive(null) }} />)}
          {active === 'bye' && BYE_OPTIONS.map((n) => <SubButton key={n} label={`Bye +${n}`} onClick={() => { onBye(n); setActive(null) }} />)}
          {active === 'leg-bye' &&
            BYE_OPTIONS.map((n) => <SubButton key={n} label={`Leg Bye +${n}`} onClick={() => { onLegBye(n); setActive(null) }} />)}
        </div>
      )}
    </div>
  )
}
