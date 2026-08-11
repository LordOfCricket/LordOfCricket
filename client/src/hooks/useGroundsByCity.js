import { useCallback, useState } from 'react'
import { searchGroundsByCity } from '../services/groundsApi.js'
import { DEFAULT_PAGE_SIZE } from '../models/groundDiscovery.model.js'

/** GET /api/grounds/search?city= (Phase 13 revision — city replaces
 * lat/lng as the discovery input). Search is submit-driven (`search(city)`),
 * not auto-fetched on mount/dependency-change like useGround.js/
 * useNearbyGrounds.js were — there's no location to "already have" the way
 * geolocation provided one, so DiscoveryPage calls `search()` directly from
 * its form's onSubmit handler. That keeps every setState call inside an
 * event handler, never inside a useEffect body, sidestepping the
 * react-hooks/set-state-in-effect lint rule entirely rather than needing
 * the derived-loading workaround the other two hooks use. */
export function useGroundsByCity() {
  const [city, setCity] = useState(null)
  const [grounds, setGrounds] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const fetchPage = useCallback((forCity, page, { append }) => {
    const setBusy = append ? setLoadingMore : setLoading
    setBusy(true)
    setError(null)
    searchGroundsByCity({ city: forCity, page, limit: DEFAULT_PAGE_SIZE })
      .then((data) => {
        setGrounds((prev) => (append ? [...prev, ...data.grounds] : data.grounds))
        setPagination(data.pagination)
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Couldn't search for grounds.")
      })
      .finally(() => setBusy(false))
  }, [])

  const search = useCallback(
    (rawCity) => {
      const trimmed = rawCity.trim()
      if (!trimmed) return
      setCity(trimmed)
      fetchPage(trimmed, 1, { append: false })
    },
    [fetchPage],
  )

  const loadMore = useCallback(() => {
    if (!city || !pagination || pagination.page >= pagination.totalPages) return
    fetchPage(city, pagination.page + 1, { append: true })
  }, [city, pagination, fetchPage])

  const retry = useCallback(() => {
    if (!city) return
    const nextPage = grounds.length === 0 ? 1 : (pagination?.page ?? 0) + 1
    fetchPage(city, nextPage, { append: nextPage > 1 })
  }, [city, grounds.length, pagination, fetchPage])

  const reset = useCallback(() => {
    setCity(null)
    setGrounds([])
    setPagination(null)
    setError(null)
  }, [])

  const hasMore = Boolean(pagination && pagination.page < pagination.totalPages)
  const searched = city !== null

  return { city, searched, grounds, pagination, loading, loadingMore, error, search, loadMore, hasMore, retry, reset }
}
