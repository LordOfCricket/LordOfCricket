import { useCallback, useState } from 'react'
import { fetchNearbyGroundsForUmpire, fetchGroundsByCityForUmpire, applyForUmpireSlot } from '../services/umpireSelfApi.js'
import { applyErrorMessage } from '../models/umpireDashboard.model.js'

const PAGE_SIZE = 20

// Same shape as useGroundSearch.js (submit-driven, not effect-driven —
// every setState call happens inside an event handler), extended with
// anyGroundsExist (drives which of the two empty-state messages to show)
// and per-match apply state (apply/applyingMatchId/applyResults), modeled
// directly on useAvailableMatches.js's apply(): the backend is always
// authoritative, so a success OR a state-changing 409 both trigger a
// refetch of the current page instead of any local count mutation.
export function useUmpireGroundDiscovery() {
  const [query, setQuery] = useState(null) // { mode: 'city'|'nearby', ...params } once searched
  const [grounds, setGrounds] = useState([])
  const [pagination, setPagination] = useState(null)
  const [anyGroundsExist, setAnyGroundsExist] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [applyingMatchId, setApplyingMatchId] = useState(null)
  const [applyResults, setApplyResults] = useState({})

  const fetchForQuery = useCallback((q, page) => {
    if (q.mode === 'city') return fetchGroundsByCityForUmpire({ city: q.city, page, limit: PAGE_SIZE })
    return fetchNearbyGroundsForUmpire({ latitude: q.latitude, longitude: q.longitude, radiusKm: q.radiusKm, page, limit: PAGE_SIZE })
  }, [])

  const fetchPage = useCallback(
    (q, page, { append }) => {
      const setBusy = append ? setLoadingMore : setLoading
      setBusy(true)
      setError(null)
      return fetchForQuery(q, page)
        .then((data) => {
          setGrounds((prev) => (append ? [...prev, ...data.grounds] : data.grounds))
          setPagination(data.pagination)
          setAnyGroundsExist(data.anyGroundsExist)
        })
        .catch((err) => {
          setError(err.response?.data?.error || "Couldn't load umpiring opportunities.")
        })
        .finally(() => setBusy(false))
    },
    [fetchForQuery],
  )

  const searchByCity = useCallback(
    (city) => {
      const trimmed = city.trim()
      if (!trimmed) return
      const q = { mode: 'city', city: trimmed }
      setQuery(q)
      fetchPage(q, 1, { append: false })
    },
    [fetchPage],
  )

  const searchNearby = useCallback(
    (latitude, longitude, radiusKm) => {
      const q = { mode: 'nearby', latitude, longitude, radiusKm }
      setQuery(q)
      fetchPage(q, 1, { append: false })
    },
    [fetchPage],
  )

  const loadMore = useCallback(() => {
    if (!query || !pagination || pagination.page >= pagination.totalPages) return
    fetchPage(query, pagination.page + 1, { append: true })
  }, [query, pagination, fetchPage])

  const retry = useCallback(() => {
    if (!query) return
    const nextPage = grounds.length === 0 ? 1 : (pagination?.page ?? 0) + 1
    fetchPage(query, nextPage, { append: nextPage > 1 })
  }, [query, grounds.length, pagination, fetchPage])

  const reset = useCallback(() => {
    setQuery(null)
    setGrounds([])
    setPagination(null)
    setAnyGroundsExist(true)
    setError(null)
  }, [])

  // Refetches every already-loaded page from page 1 so a match's real
  // filledSlots/currentUserAssigned (which could belong to any of the
  // loaded grounds, not just the first page) come back correct — matches
  // useAvailableMatches.js's "always reload from the backend, never patch
  // local state" contract.
  const refetchAll = useCallback(() => {
    if (!query || !pagination) return Promise.resolve()
    const pagesLoaded = pagination.page
    setLoading(true)
    return fetchForQuery(query, 1)
      .then(async (first) => {
        let all = first.grounds
        for (let p = 2; p <= pagesLoaded; p++) {
          const next = await fetchForQuery(query, p)
          all = [...all, ...next.grounds]
        }
        setGrounds(all)
        setPagination((prev) => ({ ...prev, page: pagesLoaded }))
        setAnyGroundsExist(first.anyGroundsExist)
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't refresh umpiring opportunities.")
      })
      .finally(() => setLoading(false))
  }, [query, pagination, fetchForQuery])

  const apply = useCallback(
    async (matchId) => {
      setApplyingMatchId(matchId)
      setApplyResults((prev) => ({ ...prev, [matchId]: null }))
      try {
        await applyForUmpireSlot(matchId)
        setApplyResults((prev) => ({ ...prev, [matchId]: { type: 'success', text: "You're assigned to umpire this match." } }))
        await refetchAll()
      } catch (err) {
        const code = err.response?.data?.code
        const text = applyErrorMessage(code, err.response?.data?.message || err.response?.data?.error)
        setApplyResults((prev) => ({ ...prev, [matchId]: { type: 'error', text } }))
        if (code === 'NO_SLOT_AVAILABLE' || code === 'ALREADY_ASSIGNED' || code === 'MATCH_NOT_ELIGIBLE') {
          await refetchAll()
        }
      } finally {
        setApplyingMatchId(null)
      }
    },
    [refetchAll],
  )

  const hasMore = Boolean(pagination && pagination.page < pagination.totalPages)
  const searched = query !== null

  return {
    mode: query?.mode ?? null,
    city: query?.city ?? null,
    radiusKm: query?.radiusKm ?? null,
    searched,
    grounds,
    pagination,
    anyGroundsExist,
    loading,
    loadingMore,
    error,
    searchByCity,
    searchNearby,
    loadMore,
    hasMore,
    retry,
    reset,
    applyingMatchId,
    applyResults,
    apply,
  }
}
