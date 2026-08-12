import { useCallback, useEffect, useState } from 'react'
import { fetchMyAssignments, fetchMyUmpireProfile } from '../services/umpireSelfApi.js'
import { bucketAssignments } from '../models/umpireDashboard.model.js'

const PREVIEW_COUNT = 5

export function useUmpireDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upcomingAssignments, setUpcomingAssignments] = useState([])
  const [upcomingAssignmentsCount, setUpcomingAssignmentsCount] = useState(0)
  const [matchesOfficiated, setMatchesOfficiated] = useState(0)
  const [ratingAvg, setRatingAvg] = useState(null)
  const [ratingCount, setRatingCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [assignments, profile] = await Promise.all([fetchMyAssignments(), fetchMyUmpireProfile()])
      const upcoming = bucketAssignments(assignments).upcoming
      setUpcomingAssignmentsCount(upcoming.length)
      setUpcomingAssignments(upcoming.slice(0, PREVIEW_COUNT))
      // Real, server-computed values (matchUmpireSlot.model.js's
      // getUmpireStats / ratingAggregation.service.js) — never
      // fabricated/estimated numbers.
      setMatchesOfficiated(profile.matches_officiated)
      setRatingAvg(profile.rating_avg)
      setRatingCount(profile.rating_count)
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
    upcomingAssignmentsCount,
    upcomingAssignments,
    matchesOfficiated,
    ratingAvg,
    ratingCount,
    refresh: load,
  }
}
