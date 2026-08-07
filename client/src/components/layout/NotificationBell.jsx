import { useEffect, useRef, useState } from 'react'
import { Bell, Calendar, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications.js'

// Phase 18 Feature 17 — wired to the real, persisted, in-app notification
// store (ground_notifications). No email/SMS — every notification here is
// generated server-side by groundBooking.service.js on booking confirm/
// cancel (see docs/ARCHITECTURE.md's Phase 18 section).

const TYPE_ICON = {
  BOOKING_APPROVED: Calendar,
  BOOKING_CANCELLED: XCircle,
  BOOKING_REMINDER: Clock,
  GROUND_CLOSED: AlertTriangle,
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

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
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-emerald-100/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-emerald-950/95 shadow-xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <div className="px-4 py-8 text-center text-sm text-emerald-100/60">Loading…</div>}
            {!loading && notifications.length === 0 && <div className="px-4 py-8 text-center text-sm text-emerald-100/60">You're all caught up.</div>}
            {!loading &&
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5 ${n.is_read ? 'opacity-60' : ''}`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-emerald-100/70">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-emerald-100/50">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
