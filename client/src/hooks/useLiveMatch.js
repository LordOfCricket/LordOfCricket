import { useCallback } from 'react'
import { useVisibilityAwarePolling } from './useVisibilityAwarePolling.js'
import { fetchLiveMatchState } from '../services/liveMatchApi.js'

// Recommended cadence (Part 7/101, documented): a fast 3s tick while the
// match is actively live (including innings break — cheap regardless of
// status, see liveMatch.service.js), a slow 30s lifecycle check while the
// match is merely upcoming (Part 20 — detect the upcoming -> live
// transition without aggressive polling), and no polling at all once the
// match has reached a terminal state.
const LIVE_INTERVAL_MS = 3000
const UPCOMING_LIFECYCLE_INTERVAL_MS = 30000

const TERMINAL_STATUSES = new Set(['completed', 'finalized'])
const isTerminalResponse = (data) => TERMINAL_STATUSES.has(data.match.status)

/**
 * Phase 10 Part 3 spectator polling. Deliberately thin: no cricket
 * calculation lives here (Part 51) — it only decides WHEN to poll
 * `/matches/:id/live-state` and hands back whatever the server returned.
 * Out-of-order responses are already impossible to apply: the transport
 * layer's request-sequence guard rejects any response older than the most
 * recently STARTED request — a strictly stronger guarantee than comparing
 * innings.version, and one that needs no special-casing for an innings
 * 1 -> innings 2 transition (Part 56/57).
 *
 * `initialStatus` should be the match's status from the page's initial
 * (non-live) load — polling stays fully disabled until it's known, so a
 * page for an already-finalized match never issues a single live-state
 * request (Part 18/96). The transport's `shouldStop` halts polling for good
 * the moment a response itself reports a terminal status — a completed/
 * finalized match never keeps polling every 3 seconds forever (Part 17/93/96).
 */
export function useLiveMatch(matchId, { initialStatus } = {}) {
  const fetchFn = useCallback(() => fetchLiveMatchState(matchId), [matchId])

  const isUpcomingSoFar = initialStatus === 'upcoming'
  const intervalMs = isUpcomingSoFar ? UPCOMING_LIFECYCLE_INTERVAL_MS : LIVE_INTERVAL_MS
  const initiallyTerminal = initialStatus != null && TERMINAL_STATUSES.has(initialStatus)
  const enabled = Boolean(matchId) && initialStatus != null && !initiallyTerminal

  const polling = useVisibilityAwarePolling(fetchFn, { intervalMs, enabled, resetKey: matchId, shouldStop: isTerminalResponse })

  return {
    liveState: polling.data,
    loading: polling.loading,
    connectionStatus: polling.status,
    lastUpdatedAt: polling.lastUpdatedAt,
    refresh: polling.refresh,
    isPolling: enabled && !(polling.data && isTerminalResponse(polling.data)),
  }
}
