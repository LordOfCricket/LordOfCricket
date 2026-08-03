import { useVisibilityAwarePolling } from './useVisibilityAwarePolling.js'
import { fetchHomeDiscovery } from '../services/publicMatchApi.js'

// Part 100/101 (documented): the homepage refreshes every ~30s while
// visible, paused when hidden — via the same shared transport every other
// spectator polling surface uses (Part 52/97), not a bespoke interval.
const HOME_POLL_INTERVAL_MS = 30000

/** Homepage match-discovery read model (Part 32) — one bounded request for
 * featured live + upcoming preview + recent results preview. Failure here
 * must not take down the rest of the homepage — this hook/section is
 * self-contained (Part 53). */
export function useHomeDiscovery() {
  const polling = useVisibilityAwarePolling(fetchHomeDiscovery, { intervalMs: HOME_POLL_INTERVAL_MS, enabled: true })
  return {
    data: polling.data,
    loading: polling.loading,
    error: polling.loading ? null : polling.error ? polling.error.response?.data?.message || "Couldn't load match activity." : null,
    retry: polling.refresh,
  }
}
