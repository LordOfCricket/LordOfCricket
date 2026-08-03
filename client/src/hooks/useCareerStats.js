import { useCallback, useEffect, useState } from 'react'
import { fetchMyStats, fetchPlayerStats } from '../services/statisticsApi.js'

const DEFAULT_MATCH_HISTORY_LIMIT = 10

/**
 * Loads official career statistics for either the signed-in user (no args)
 * or a specific player by public ID. Always hits PostgreSQL through the
 * statistics API — never reads/writes localStorage — so a browser refresh
 * always reproduces identical numbers (Phase 7 acceptance requirement).
 */
export function useCareerStats(publicPlayerId = null) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [matchHistoryLimit, setMatchHistoryLimit] = useState(DEFAULT_MATCH_HISTORY_LIMIT)

  const fetchStats = useCallback(
    (limit) => {
      const request = publicPlayerId ? fetchPlayerStats(publicPlayerId, { limit }) : fetchMyStats({ limit })
      return request
        .then((data) => {
          setStats(data)
          setError(null)
        })
        .catch((err) => setError(err.response?.data?.message || "Couldn't load career statistics."))
        .finally(() => setLoading(false))
    },
    [publicPlayerId]
  )

  // Initial/publicPlayerId-change load: no synchronous setLoading(true) here —
  // `loading` already starts true, so nothing needs resetting on first mount.
  useEffect(() => {
    fetchStats(matchHistoryLimit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicPlayerId])

  const retry = useCallback(() => {
    setLoading(true)
    fetchStats(matchHistoryLimit)
  }, [fetchStats, matchHistoryLimit])

  const loadMoreMatchHistory = useCallback(() => {
    const next = matchHistoryLimit + DEFAULT_MATCH_HISTORY_LIMIT
    setMatchHistoryLimit(next)
    setLoading(true)
    fetchStats(next)
  }, [matchHistoryLimit, fetchStats])

  return { stats, loading, error, retry, loadMoreMatchHistory }
}
