import { pool, isMongoReady } from '../config/db.js'
import { isCalendarConfigured } from '../services/googleCalendar.service.js'
import { isAIConfigured } from '../ai/aiProvider.js'

// Liveness — "is the process up at all". Deliberately checks nothing
// external (no DB query) so an orchestrator's liveness probe can't be made
// to restart a perfectly healthy process just because a downstream
// dependency is slow/down — that's what /health/ready is for.
export function getHealth(req, res) {
  res.json({ status: 'ok' })
}

// Readiness — "is this instance able to actually serve real requests".
// PostgreSQL is the only hard dependency (every core feature needs it);
// MongoDB/Google Calendar/AI are optional-by-design (see
// docs/ARCHITECTURE.md) and are reported as informational state, never as a
// reason to fail readiness — an instance with Mongo down is still fully
// able to serve cricket scoring, booking, tournaments, etc.
export async function getReadiness(req, res) {
  let postgres = 'error'
  try {
    await pool.query('SELECT 1')
    postgres = 'connected'
  } catch {
    // swallow — reflected in the response body below, not thrown further
  }

  const body = {
    status: postgres === 'connected' ? 'ready' : 'not_ready',
    postgres,
    optional: {
      mongodb: isMongoReady() ? 'connected' : 'disconnected',
      googleCalendar: isCalendarConfigured() ? 'configured' : 'not_configured',
      ai: isAIConfigured() ? 'configured' : 'not_configured',
    },
  }
  res.status(postgres === 'connected' ? 200 : 503).json(body)
}
