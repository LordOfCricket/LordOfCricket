import { useCallback, useEffect, useState } from 'react'
import { fetchAvailableMatches, applyForUmpireSlot } from '../services/umpireSelfApi.js'
import { applyErrorMessage } from '../models/umpireDashboard.model.js'

export function useAvailableMatches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applyingId, setApplyingId] = useState(null)
  // Keyed by match id — {type: 'success'|'error', text} — so each card can
  // show its own outcome without a global toast.
  const [applyResults, setApplyResults] = useState({})

  const load = useCallback(async () => {
    try {
      const data = await fetchAvailableMatches()
      setMatches(data)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load available matches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  // The backend is authoritative — this never marks a match "taken" without
  // a real 201 back, and a 409 (someone else claimed the last slot between
  // page load and this click) is handled explicitly, not shown as success.
  // Takes the full match (not just an id), same shape as useMyAssignments'
  // cancel(assignment), so the confirmation prompt can show real match
  // details instead of a bare id.
  const apply = async (match) => {
    const matchId = match.id
    if (!window.confirm(`Apply to umpire ${match.team_a_name} vs ${match.team_b_name}${match.ground_name ? ` at ${match.ground_name}` : ''}?`)) return

    setApplyingId(matchId)
    setApplyResults((prev) => ({ ...prev, [matchId]: null }))
    try {
      await applyForUmpireSlot(matchId)
      setApplyResults((prev) => ({ ...prev, [matchId]: { type: 'success', text: "You're assigned to umpire this match." } }))
      // Refresh so slot counts (and a now-fully-filled match dropping out of
      // the list entirely) reflect the real backend state, not a guess.
      await load()
    } catch (err) {
      const code = err.response?.data?.code
      const text = applyErrorMessage(code, err.response?.data?.message || err.response?.data?.error)
      setApplyResults((prev) => ({ ...prev, [matchId]: { type: 'error', text } }))
      if (code === 'NO_SLOT_AVAILABLE' || code === 'ALREADY_ASSIGNED' || code === 'MATCH_NOT_ELIGIBLE') {
        await load()
      }
    } finally {
      setApplyingId(null)
    }
  }

  return { matches, loading, error, applyingId, applyResults, apply, refresh: load }
}
