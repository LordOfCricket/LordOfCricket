import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-emerald-100/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-emerald-950/95 shadow-xl shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
          </div>
          <div className="px-4 py-8 text-center text-sm text-emerald-100/60">You're all caught up.</div>
        </div>
      )}
    </div>
  )
}
