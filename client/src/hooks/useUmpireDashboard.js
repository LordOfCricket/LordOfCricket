import { useCallback, useEffect, useState } from 'react'
import { fetchAvailableMatches, fetchMyAssignments, fetchMyUmpireProfile } from '../services/umpireSelfApi.js'
import { bucketAssignments } from '../models/umpireDashboard.model.js'

const PREVIEW_COUNT = 5

export function useUmpireDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availableCount, setAvailableCount] = useState(0)
  const [upcomingAssignments, setUpcomingAssignments] = useState([])
  const [upcomingAssignmentsCount, setUpcomingAssignmentsCount] = useState(0)
  const [matchesOfficiated, setMatchesOfficiated] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [available, assignments, profile] = await Promise.all([fetchAvailableMatches(), fetchMyAssignments(), fetchMyUmpireProfile()])
      const upcoming = bucketAssignments(assignments).upcoming
      setAvailableCount(available.length)
      setUpcomingAssignmentsCount(upcoming.length)
      setUpcomingAssignments(upcoming.slice(0, PREVIEW_COUNT))
      // Real, server-computed count (matchUmpireSlot.model.js's
      // getUmpireStats) — never a fabricated/estimated number.
      setMatchesOfficiated(profile.matches_officiated)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return {
    loading,
    error,
    availableCount,
    upcomingAssignmentsCount,
    upcomingAssignments,
    matchesOfficiated,
    refresh: load,
  }
}
