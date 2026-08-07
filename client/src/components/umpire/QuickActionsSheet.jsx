import { useState } from 'react'
import { ClipboardList, ChevronDown } from 'lucide-react'
import CatchDroppedModal from './CatchDroppedModal.jsx'
import FieldingEventModal from './FieldingEventModal.jsx'
import AppealModal from './AppealModal.jsx'
import ReviewModal from './ReviewModal.jsx'
import PenaltyModal from './PenaltyModal.jsx'

const ACTIONS = [
  { id: 'catch-dropped', label: 'Catch Dropped' },
  { id: 'appeal', label: 'Appeal' },
  { id: 'review', label: 'Review' },
  { id: 'fielding-event', label: 'Fielding Event' },
  { id: 'dead-ball', label: 'Dead Ball' },
  { id: 'penalty', label: 'Penalty' },
]

export default function QuickActionsSheet({ disabled, match, innings, pendingShot, onRecordEvent, onDeadBall, onPenalty }) {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)

  const handleClick = (id) => {
    if (id === 'dead-ball') {
      onDeadBall()
      return
    }
    setActiveModal(id)
  }

  const enrich = (payload) => ({ ...payload, batsmanId: innings.ends.strikerEnd, bowlerId: innings.bowlerId })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-100/70">
          <ClipboardList className="h-4 w-4 text-emerald-300" /> Quick Actions
        </span>
        <ChevronDown className={`h-4 w-4 text-emerald-100/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(a.id)}
              className="min-h-11 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-emerald-100/80 transition-all hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <CatchDroppedModal
        open={activeModal === 'catch-dropped'}
        onClose={() => setActiveModal(null)}
        match={match}
        innings={innings}
        pendingShot={pendingShot}
        onConfirm={(payload) => onRecordEvent('catch-dropped', enrich(payload), Boolean(payload.shot))}
      />
      <FieldingEventModal
        open={activeModal === 'fielding-event'}
        onClose={() => setActiveModal(null)}
        match={match}
        innings={innings}
        onConfirm={(payload) => onRecordEvent('fielding-event', enrich(payload), false)}
      />
      <AppealModal open={activeModal === 'appeal'} onClose={() => setActiveModal(null)} onConfirm={(payload) => onRecordEvent('appeal', enrich(payload), false)} />
      <ReviewModal open={activeModal === 'review'} onClose={() => setActiveModal(null)} onConfirm={(payload) => onRecordEvent('review', enrich(payload), false)} />
      <PenaltyModal open={activeModal === 'penalty'} onClose={() => setActiveModal(null)} onConfirm={onPenalty} />
    </div>
  )
}
