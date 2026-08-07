import { useState } from 'react'
import { X } from 'lucide-react'
import DeliveryHistoryList from './DeliveryHistoryList.jsx'
import DeliveryEditor from './DeliveryEditor.jsx'
import CorrectionHistoryList from './CorrectionHistoryList.jsx'
import { findBowlerChangeEventForOver } from '../../models/matchStats.model.js'

export default function EditScoreOverlay({ match, innings, corrections, getPreview, onCorrectEntry, canUndoCorrection, onUndoCorrection, onClose }) {
  const [selectedId, setSelectedId] = useState(null)
  const selectedDelivery = selectedId ? innings.deliveries.find((d) => d.id === selectedId) : null

  const handleApply = (entryId, patch, reason) => {
    onCorrectEntry(entryId, patch, reason)
    setSelectedId(null)
  }

  const handleCorrectBowler = (overNumber, newBowlerId) => {
    const eventId = findBowlerChangeEventForOver(innings.events, overNumber)
    if (eventId) onCorrectEntry(eventId, { bowlerId: newBowlerId }, 'Wrong Bowler')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-emerald-950">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {selectedDelivery && (
            <button type="button" onClick={() => setSelectedId(null)} className="text-sm text-emerald-100/70 hover:text-white">
              ← Back
            </button>
          )}
          <h2 className="text-base font-bold text-white">{selectedDelivery ? 'Edit Delivery' : 'Score Correction / Delivery History'}</h2>
        </div>
        <button type="button" onClick={onClose} className="text-emerald-100/50 hover:text-white" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1">
        {selectedDelivery ? (
          <DeliveryEditor
            match={match}
            innings={innings}
            delivery={selectedDelivery}
            getPreview={getPreview}
            onApply={handleApply}
            onCorrectBowler={handleCorrectBowler}
            onCancel={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <DeliveryHistoryList match={match} innings={innings} corrections={corrections} onSelectDelivery={setSelectedId} />
            </div>
            <CorrectionHistoryList corrections={corrections} canUndoCorrection={canUndoCorrection} onUndoCorrection={onUndoCorrection} />
          </div>
        )}
      </div>
    </div>
  )
}
