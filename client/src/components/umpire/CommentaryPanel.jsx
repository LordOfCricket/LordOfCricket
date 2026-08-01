import { useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'

export default function CommentaryPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-100/70">
          <Sparkles className="h-4 w-4 text-amber-300" /> AI Commentary
        </span>
        <ChevronDown className={`h-4 w-4 text-emerald-100/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-white/10 px-5 py-4 text-sm text-emerald-100/50">AI Commentary integration coming soon.</div>}
    </div>
  )
}
