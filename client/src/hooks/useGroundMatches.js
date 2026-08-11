import { useCallback, useEffect, useState } from 'react'
import { fetchGroundMatches, createGroundMatch } from '../services/groundOwnerApi.js'

export function useGroundMatches(publicGroundId) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    if (!publicGroundId) return
    setLoading(true)
    try {
      setMatches(await fetchGroundMatches(publicGroundId))
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load matches for this ground.')
    } finally {
      setLoading(false)
    }
  }, [publicGroundId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  // The backend derives ground_id from the authorized :publicGroundId route
  // context (requireGroundRole) — this never sends a groundId itself.
  const create = async ({ teamAId, teamBId, matchDate, requiredUmpires }) => {
    setCreating(true)
    setCreateError('')
    try {
      await createGroundMatch(publicGroundId, { teamAId, teamBId, matchDate, requiredUmpires })
      await load()
      return true
    } catch (err) {
      setCreateError(err.response?.data?.error || err.response?.data?.message || 'Unable to create this match.')
      return false
    } finally {
      setCreating(false)
    }
  }

  return { matches, loading, error, creating, createError, create, refresh: load }
}
