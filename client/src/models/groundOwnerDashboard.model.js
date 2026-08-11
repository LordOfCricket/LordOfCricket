// U5 — pure helpers for the Ground Owner dashboard/match-list pages.

// Accepts either the ground-owner match-list shape (total_slots/
// filled_slots, from findMatchesByGroundId) or the "my grounds" aggregate
// shape (umpireSlotsTotal/umpireSlotsFilled) — same 3-state logic either way.
export function slotStatusInfo(match) {
  const total = match?.total_slots ?? match?.umpireSlotsTotal ?? 0
  const filled = match?.filled_slots ?? match?.umpireSlotsFilled ?? 0

  if (total === 0) return { emoji: '⚪', label: 'No umpire slots configured' }
  if (filled >= total) return { emoji: '🟢', label: 'Fulfilled' }
  if (filled === 0) return { emoji: '🔴', label: 'Needs Umpires' }
  const open = total - filled
  return { emoji: '🟡', label: `${open} Slot${open === 1 ? '' : 's'} Available` }
}

export function filterUpcomingMatches(matches) {
  return (matches || []).filter((m) => m.status === 'upcoming')
}

// Per-slot rows (from GET /matches/:matchId/umpire-slots) into the display
// shape the Ground Owner view needs — real assigned-umpire name, or an
// honest "Slot Available", never a fabricated placeholder.
export function describeSlot(slot) {
  if (slot.status === 'ASSIGNED' && slot.umpire_name) {
    return { label: slot.umpire_name, detail: 'Assigned' }
  }
  return { label: 'Slot Available', detail: null }
}
