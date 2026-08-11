import { useState } from 'react'
import { fetchMatchUmpireSlots } from '../services/umpireSelfApi.js'

// Lazy, on-demand fetch of one match's per-slot umpire detail (U3's
// GET /matches/:matchId/umpire-slots) — not called for every match card on
// page load, only when the Ground Owner actually expands one.
export function useMatchUmpireSlots() {
  const [slotsByMatch, setSlotsByMatch] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  const load = async (matchId) => {
    if (slotsByMatch[matchId]) return
    setLoadingId(matchId)
    setError('')
    try {
      const slots = await fetchMatchUmpireSlots(matchId)
      setSlotsByMatch((prev) => ({ ...prev, [matchId]: slots }))
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load umpire status for this match.')
    } finally {
      setLoadingId(null)
    }
  }

  return { slotsByMatch, loadingId, error, load }
}
