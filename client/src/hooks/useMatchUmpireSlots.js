import { useState } from 'react'
import { fetchGroundMatchUmpireSlots } from '../services/groundOwnerApi.js'

// Lazy, on-demand fetch of one match's per-slot umpire detail, properly
// scoped to the owner of the match's own ground (requireGroundRole
// server-side) — not called for every match card on page load, only when
// the Ground Owner actually expands one.
export function useMatchUmpireSlots(publicGroundId) {
  const [slotsByMatch, setSlotsByMatch] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  const load = async (matchId) => {
    if (slotsByMatch[matchId]) return
    setLoadingId(matchId)
    setError('')
    try {
      const slots = await fetchGroundMatchUmpireSlots(publicGroundId, matchId)
      setSlotsByMatch((prev) => ({ ...prev, [matchId]: slots }))
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load umpire status for this match.')
    } finally {
      setLoadingId(null)
    }
  }

  return { slotsByMatch, loadingId, error, load }
}
