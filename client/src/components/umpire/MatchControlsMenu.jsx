import { useState } from 'react'
import { Settings, ChevronDown } from 'lucide-react'

export default function MatchControlsMenu({ canEndInnings, onEndInnings, onResetMatch }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100/70 transition-colors hover:bg-white/10"
      >
        <Settings className="h-3.5 w-3.5" /> Match Controls <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 bg-emerald-950 p-2 shadow-2xl">
          {canEndInnings && (
            <button type="button" onClick={() => setConfirm('end-innings')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-100/80 hover:bg-white/10">
              End Innings
            </button>
          )}
          <button type="button" onClick={() => setConfirm('reset')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/10">
            Reset Match
          </button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-emerald-950 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-white">
              {confirm === 'end-innings' ? 'End the current innings and start the second innings?' : 'This will remove all testing match data.'}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm === 'end-innings') onEndInnings()
                  else onResetMatch()
                  setConfirm(null)
                  setOpen(false)
                }}
                className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white"
              >
                {confirm === 'end-innings' ? 'End Innings' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
